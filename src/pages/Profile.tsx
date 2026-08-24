import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { trackSellerProfileViewed } from '../lib/analytics';
import { Loader2, Star, Calendar, Activity } from 'lucide-react';
import catAvatar from '../assets/cat.png';
import verifiedIcon from '../assets/verified.png';
import secureIcon from '../assets/secure.png';
import messengerIcon from '../assets/messenger.png';

import { BetaBadge } from '../components/BetaBadge';

export default function Profile() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState<number>(5);

  useEffect(() => {
    if (slug) {
      fetchProfile();
    }
  }, [slug]);

  const fetchProfile = async () => {
    try {
      // First try to match by slug, if not try by id (for backward compatibility)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug || '');
      
      let query = supabase.from('profiles').select('*');
      if (isUuid) {
        query = query.eq('id', slug);
      } else {
        query = query.eq('slug', slug);
      }
      
      const { data: profileData, error: profileError } = await query.single();

      if (profileError) throw profileError;
      setProfile(profileData);

      if (profileData?.is_seller) {
        const [servicesRes, reviewsRes] = await Promise.all([
          supabase
            .from('services')
            .select('*, categories(name), reviews(rating)')
            .eq('seller_id', profileData.id)
            .eq('status', 'active'),
          supabase
            .from('reviews')
            .select('*, buyer:profiles!reviews_buyer_id_fkey(full_name, avatar_url, is_verified, role, is_beta), service:services(title)')
            .eq('seller_id', profileData.id)
            .order('created_at', { ascending: false })
        ]);
        
        if (servicesRes.data) {
          // Compute average ratings
          const processedServices = servicesRes.data.map(service => {
            const revs = service.reviews || [];
            const avg = revs.length > 0 
              ? revs.reduce((acc: number, curr: any) => acc + curr.rating, 0) / revs.length 
              : 5.0;
            return { ...service, averageRating: Math.round(avg * 10) / 10, reviewCount: revs.length };
          });
          setServices(processedServices);
          trackSellerProfileViewed(profileData, processedServices.length);
        }

        if (reviewsRes.data) {
          setReviews(reviewsRes.data);
          if (reviewsRes.data.length > 0) {
            const avg = reviewsRes.data.reduce((acc: number, curr: any) => acc + curr.rating, 0) / reviewsRes.data.length;
            setAverageRating(Math.round(avg * 10) / 10);
          }
        }
      }
    } catch (err) {
      console.error('Erreur lors du chargement du profil:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-frilya-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Profil introuvable</h2>
        <p className="text-slate-600 mb-6">Cet utilisateur n'existe pas ou a supprimé son compte.</p>
        <Link to="/" className="text-frilya-600 font-bold hover:underline">Retour à l'accueil</Link>
      </div>
    );
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="h-40 bg-frilya-900 w-full relative">
          {profile.banner_url && (
            <img src={profile.banner_url} alt="Bannière" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
        </div>
        <div className="px-6 md:px-10 pb-10 relative">
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <div className="-mt-16 w-32 h-32 rounded-full overflow-hidden border-4 border-white bg-white shrink-0 shadow-md relative z-10">
              <img 
                src={profile.avatar_url || catAvatar} 
                alt={profile.full_name || 'Utilisateur'}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 pt-2 md:pt-4">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold text-slate-900">{profile.full_name || 'Utilisateur anonyme'}</h1>
                {profile.is_verified && (
                  <div className="relative group cursor-pointer flex items-center ml-1">
                    <img src={verifiedIcon} alt="Vérifié" className="w-5 h-5" />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 text-center">
                      Compte vérifié. Frilya certifie que ce compte est authentique.
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                    </div>
                  </div>
                )}
                {profile.role === 'admin' && (
                  <div className="relative group cursor-pointer flex items-center ml-1">
                    <img src={secureIcon} alt="Officiel" className="w-5 h-5" />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 text-center">
                      Ce compte est certifié car il s'agit d'un compte officiel de l'équipe Frilya.
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                    </div>
                  </div>
                )}
                {profile.is_beta && <div className="ml-1"><BetaBadge /></div>}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  {profile.is_seller ? 'Vendeur' : 'Acheteur'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Membre depuis {joinDate}
                </span>
                <span className="flex items-center gap-1" title="Dernière connexion">
                  <Activity className="w-4 h-4 text-slate-400" />
                  {(profile.last_seen || profile.created_at) ? new Date(profile.last_seen || profile.created_at).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  }) : 'Inconnu'}
                </span>
                {profile.is_seller && reviews.length > 0 && (
                  <a href="#reviews-section" className="flex items-center gap-1 hover:bg-slate-50 px-2 py-1 -ml-2 rounded-lg transition-colors group/rating">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400 group-hover/rating:scale-110 transition-transform" />
                    <span className="font-bold text-slate-900">{averageRating.toFixed(1)}</span>
                    <span className="text-slate-500">({reviews.length} avis)</span>
                  </a>
                )}
              </div>
            </div>
            <div className="w-full md:w-auto shrink-0 pt-2 md:pt-4">
              <Link to={`/tableau-de-bord/messages?contact=${profile.id}`} className="w-full md:w-auto bg-frilya-600 hover:bg-frilya-500 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2">
                <img src={messengerIcon} alt="Message" className="w-4 h-4" />
                Contacter
              </Link>
            </div>
          </div>

          <div className="prose max-w-none text-slate-700">
            <h3 className="text-lg font-bold text-slate-900 mb-2">À propos</h3>
            {profile.bio ? (
              <p className="whitespace-pre-wrap">{profile.bio}</p>
            ) : (
              <p className="italic text-slate-500">Cet utilisateur n'a pas encore rédigé de description.</p>
            )}
          </div>
        </div>
      </div>

      {profile.is_seller && (
        <div className="space-y-12">
          {/* Section Services */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Les services de {profile.full_name?.split(' ')[0]}</h2>
            
            {services.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                  <Link key={service.id} to={`/service/${service.id}`} className="group bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                    <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                      {service.cover_image_url ? (
                        <img 
                          src={service.cover_image_url} 
                          alt={service.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          Aucune image
                        </div>
                      )}
                      {service.categories?.name && (
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg">
                          {service.categories.name}
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-slate-900 text-lg mb-2 line-clamp-2 group-hover:text-frilya-600 transition-colors">
                        {service.title}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-slate-500 mb-4">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-slate-700">{service.averageRating?.toFixed(1) || '5.0'}</span>
                        <span>({service.reviewCount || 0} avis)</span>
                      </div>
                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">À partir de</span>
                        <span className="text-lg font-bold text-slate-900">{service.price_basic} €</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
                <p className="text-slate-500">Aucun service actif pour le moment.</p>
              </div>
            )}
          </div>

          {/* Section Avis */}
          <div id="reviews-section" className="scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Avis des acheteurs ({reviews.length})</h2>
            
            {reviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={review.buyer?.avatar_url || catAvatar} 
                          alt="Avatar" 
                          className="w-12 h-12 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="flex items-center gap-1 font-bold text-slate-900">
                            {review.buyer?.full_name || 'Utilisateur anonyme'}
                            {review.buyer?.is_verified && (
                              <div className="relative group cursor-pointer flex items-center ml-1">
                                <img src={verifiedIcon} alt="Vérifié" className="w-3.5 h-3.5" />
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 text-center font-normal">
                                  Compte vérifié. Frilya certifie que ce compte est authentique.
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                                </div>
                              </div>
                            )}
                            {review.buyer?.role === 'admin' && (
                              <div className="relative group cursor-pointer flex items-center ml-0.5">
                                <img src={secureIcon} alt="Officiel" className="w-3.5 h-3.5" />
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 text-center font-normal">
                                  Ce compte est certifié car il s'agit d'un compte officiel de l'équipe Frilya.
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                                </div>
                              </div>
                            )}
                            {review.buyer?.is_beta && <div className="ml-1 scale-75 origin-left"><BetaBadge /></div>}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span>{new Date(review.created_at).toLocaleDateString('fr-FR')}</span>
                            <span>•</span>
                            <span className="italic truncate max-w-[150px] sm:max-w-[200px]">{review.service?.title}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-amber-700">{review.rating}</span>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-slate-700 text-sm whitespace-pre-wrap flex-1">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
                <p className="text-slate-500">Cet utilisateur n'a pas encore reçu d'avis.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}