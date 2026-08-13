import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, Star, MessageSquare, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingOrder, setReviewingOrder] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setCurrentUser(session.user);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          services(id, title, cover_image_url),
          profiles!seller_id(id, full_name, avatar_url),
          reviews(id, rating, comment)
        `)
        .eq('buyer_id', session.user.id)
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
                      <h3 className="font-bold text-lg text-slate-900">{order.services?.title || 'Service inconnu'}</h3>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-sm text-slate-500 mb-2">Vendu par <span className="font-bold text-slate-700">{order.profiles?.full_name}</span></p>
                    <p className="text-sm text-slate-500">Date : {new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap items-center gap-4 justify-between">
                    <span className="font-bold text-xl text-frilya-600">{order.amount} €</span>
                    
                    <div className="flex gap-2">
                      <Link to={`/tableau-de-bord/messages?contact=${order.seller_id}`} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold text-sm transition-colors flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> Contacter
                      </Link>
                      
                      {/* Avis conditionnel */}
                      {(order.status === 'delivered' || order.status === 'completed') && (
                        order.reviews && order.reviews.length > 0 ? (
                          <div className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-500 fill-current" /> Avis publié ({order.reviews[0].rating}/5)
                          </div>
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
