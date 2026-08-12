import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Star, Calendar } from 'lucide-react';
import catAvatar from '../assets/cat.png';
import verifiedIcon from '../assets/verified.png';
import messengerIcon from '../assets/messenger.png';

export default function Profile() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);

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
        const { data: servicesData } = await supabase
          .from('services')
          .select('*, categories(name)')
          .eq('seller_id', profileData.id)
          .eq('status', 'active');
        
        if (servicesData) setServices(servicesData);
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
                  <div className="relative group cursor-pointer flex items-center">
                    <img src={verifiedIcon} alt="Vérifié" className="w-6 h-6" />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 text-center">
                      Compte vérifié. Frilya certifie que ce compte est authentique.
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                    </div>
                  </div>
                )}
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
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Les services de {profile.full_name?.split(' ')[0]}</h2>
          
          {services.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <Link key={service.id} to={`/service/${service.id}`} className="group bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                  <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800" 
                      alt="Service placeholder" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
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
                      <span className="font-bold text-slate-700">5.0</span>
                      <span>(0 avis)</span>
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
      )}
    </div>
  );
}