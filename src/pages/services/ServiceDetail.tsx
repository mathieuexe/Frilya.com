import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Star, Clock, CheckCircle, ShieldCheck, Heart, Share2, Loader2 } from 'lucide-react';
import verifiedIcon from '../../assets/verified.png';

export default function ServiceDetail() {
  const { id } = useParams();
  const [service, setService] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState<number>(5);
  const [activePackage, setActivePackage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBetaActive, setIsBetaActive] = useState(false);

  useEffect(() => {
    fetchService();
  }, [id]);

  const fetchService = async () => {
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
      // Check if id is a UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || '');

      let query = supabase
        .from('services')
        .select('*, profiles(full_name, avatar_url, bio, created_at, is_verified, slug)');
        
      if (isUuid) {
        query = query.eq('id', id);
      } else {
        query = query.eq('slug', id);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      setService(data);

      // Fetch packages
      const { data: pkgs } = await supabase
        .from('service_packages')
        .select('*')
        .eq('service_id', data.id)
        .order('price', { ascending: true });
        
      if (pkgs && pkgs.length > 0) {
        setPackages(pkgs);
        setActivePackage(pkgs[0]);
      } else {
        // Fallback for older services without packages
        setActivePackage({
          name: 'Formule Basique',
          description: "La prestation de base décrite dans l'annonce.",
          price: data.price_basic,
          delivery_days: data.delivery_time_days
        });
      }

      // Fetch media
      const { data: med } = await supabase
        .from('service_media')
        .select('*')
        .eq('service_id', data.id)
        .order('position', { ascending: true });
        
      if (med) setMedia(med);

      // Fetch reviews
      const { data: revs } = await supabase
        .from('reviews')
        .select('*, buyer_id(full_name, avatar_url)')
        .eq('service_id', data.id)
        .order('created_at', { ascending: false });

      if (revs && revs.length > 0) {
        setReviews(revs);
        const avg = revs.reduce((acc: number, curr: any) => acc + curr.rating, 0) / revs.length;
        setAverageRating(Math.round(avg * 10) / 10);
      }

    } catch (error) {
      console.error("Erreur", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-frilya-600" /></div>;
  }

  if (!service) {
    return <div className="text-center py-20 font-bold text-xl">Service introuvable.</div>;
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Header Service (Breadcrumb) */}
      <div className="bg-white border-b border-slate-200 py-3">
        <div className="container mx-auto px-4">
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <Link to="/recherche" className="hover:text-frilya-600">Accueil</Link>
            <span>/</span>
            <Link to="/recherche" className="hover:text-frilya-600">Services</Link>
            <span>/</span>
            <span className="text-slate-900 truncate max-w-xs">{service.title}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Colonne Principale (Gauche) */}
          <div className="flex-1 space-y-8">
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
                {service.title}
              </h1>
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
                <div className="flex items-center gap-3">
                  <Link to={`/profil/${service.profiles?.slug || service.seller_id}`} className="w-10 h-10 bg-frilya-100 rounded-full flex items-center justify-center font-bold text-frilya-600 shrink-0 hover:ring-2 hover:ring-frilya-400 transition-all overflow-hidden">
                    {service.profiles?.avatar_url ? (
                      <img src={service.profiles.avatar_url} alt={service.profiles.full_name} className="w-full h-full object-cover" />
                    ) : (
                      service.profiles?.full_name?.charAt(0) || 'V'
                    )}
                  </Link>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link to={`/profil/${service.profiles?.slug || service.seller_id}`} className="font-bold text-slate-900 hover:text-frilya-600 transition-colors">
                        {service.profiles?.full_name || 'Vendeur Mystère'}
                      </Link>
                      {service.profiles?.is_verified && (
                        <div className="relative group cursor-pointer flex items-center">
                          <img src={verifiedIcon} alt="Vérifié" className="w-4 h-4" />
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 text-center">
                            Compte vérifié. Frilya certifie que ce compte est authentique.
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Star className="w-4 h-4 text-amber-500 fill-current" />
                      <span className="font-bold text-amber-500">{averageRating.toFixed(1)}</span>
                      <span>({reviews.length} avis)</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                    <Heart className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-frilya-600 hover:bg-frilya-50 rounded-full transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Image / Galerie */}
              <div className="aspect-video bg-slate-100 rounded-2xl mb-8 overflow-hidden relative">
                {media && media.length > 0 ? (
                  <img src={media[0].url} alt={service.title} className="w-full h-full object-cover" />
                ) : service.cover_image_url ? (
                  <img src={service.cover_image_url} alt={service.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    Aucune image
                  </div>
                )}
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-4">À propos de ce service</h2>
              <div className="prose max-w-none text-slate-600 whitespace-pre-line">
                {service.description}
              </div>
            </div>

            {/* Section Avis */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Avis des clients ({reviews.length})</h2>
              
              {reviews.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl">
                  <p className="text-slate-500 font-medium">Ce service n'a pas encore reçu d'avis.</p>
                  <p className="text-sm text-slate-400 mt-1">Passez commande pour être le premier à laisser un avis !</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {reviews.map(review => (
                    <div key={review.id} className="border-b border-slate-100 last:border-0 pb-6 last:pb-0">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full overflow-hidden shrink-0">
                          {review.buyer_id?.avatar_url ? (
                            <img src={review.buyer_id.avatar_url} alt={review.buyer_id.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-sm">
                              {review.buyer_id?.full_name?.charAt(0) || 'A'}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{review.buyer_id?.full_name || 'Acheteur Anonyme'}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star 
                                  key={star} 
                                  className={`w-3 h-3 ${review.rating >= star ? 'text-amber-500 fill-current' : 'text-slate-200'}`} 
                                />
                              ))}
                            </div>
                            <span className="text-xs text-slate-400">
                              il y a {Math.floor((new Date().getTime() - new Date(review.created_at).getTime()) / (1000 * 3600 * 24))} jours
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-slate-700 italic">"{review.comment}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section Vendeur */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6">À propos du vendeur</h2>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <Link to={`/profil/${service.profiles?.slug || service.seller_id}`} className="w-24 h-24 bg-frilya-100 rounded-full flex items-center justify-center font-bold text-3xl text-frilya-600 shrink-0 hover:ring-4 hover:ring-frilya-100 transition-all overflow-hidden">
                  {service.profiles?.avatar_url ? (
                    <img src={service.profiles.avatar_url} alt={service.profiles.full_name} className="w-full h-full object-cover" />
                  ) : (
                    service.profiles?.full_name?.charAt(0) || 'V'
                  )}
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link to={`/profil/${service.profiles?.slug || service.seller_id}`} className="text-lg font-bold text-slate-900 hover:text-frilya-600 transition-colors">
                      {service.profiles?.full_name || 'Vendeur Mystère'}
                    </Link>
                    {service.profiles?.is_verified && (
                      <div className="relative group cursor-pointer flex items-center">
                        <img src={verifiedIcon} alt="Vérifié" className="w-5 h-5" />
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 text-center">
                          Compte vérifié. Frilya certifie que ce compte est authentique.
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mb-4">Membre depuis {new Date(service.profiles?.created_at).getFullYear()}</p>
                  <p className="text-slate-600 mb-4">
                    {service.profiles?.bio || "Ce vendeur n'a pas encore rédigé de description."}
                  </p>
                  <Link to={`/tableau-de-bord/messages?contact=${service.seller_id}`} className="inline-block px-6 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors text-center">
                    Contacter
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne Latérale (Droite) - Pricing & CTA */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 sticky top-24">
              
              {packages.length > 1 && (
                <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                  {packages.map(pkg => (
                    <button
                      key={pkg.id}
                      onClick={() => setActivePackage(pkg)}
                      className={`flex-1 text-sm font-bold py-2 px-3 rounded-lg transition-all ${
                        activePackage?.id === pkg.id 
                          ? 'bg-white text-frilya-600 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {pkg.name || pkg.package_type}
                    </button>
                  ))}
                </div>
              )}

              {activePackage && (
                <>
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xl font-bold text-slate-900">{activePackage.name}</h3>
                    <span className="text-2xl font-bold text-frilya-600">{activePackage.price} €</span>
                  </div>

                  <p className="text-sm text-slate-600 mb-6 font-medium">
                    {activePackage.description}
                  </p>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                      <Clock className="w-4 h-4 text-slate-400" />
                      Livraison en {activePackage.delivery_days} jour(s)
                    </div>
                    {activePackage.revisions_included > 0 && (
                      <div className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                        <CheckCircle className="w-4 h-4 text-slate-400" />
                        {activePackage.revisions_included} Révision(s) incluse(s)
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <ShieldCheck className="w-4 h-4 text-green-500" />
                      Paiement sécurisé
                    </div>
                  </div>

                  {isBetaActive ? (
                    <div className="w-full bg-slate-100 text-slate-500 text-center font-bold py-4 px-4 rounded-xl cursor-not-allowed">
                      Commandes désactivées en mode Bêta
                    </div>
                  ) : (
                    <Link 
                      to={`/paiement/${service.id}?pkg=${activePackage.id || 'basic'}`}
                      className="w-full flex justify-center items-center bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-4 px-4 rounded-xl transition-colors shadow-md"
                    >
                      Commander ({activePackage.price} €)
                    </Link>
                  )}
                </>
              )}
              
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                L'argent est bloqué jusqu'à livraison
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}