import { Link } from 'react-router-dom';
import { 
  Search,
  Star 
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Images (on garde que les illustrations nécessaires, on supprime les icones PNG inutilisées)
import sarahImg from '../assets/Sarah.png';
import thomasImg from '../assets/Thomas.png';
import leaImg from '../assets/Léa.png';

import stripeLogo from '../assets/stripe.svg';
import pciLogo from '../assets/pcisecuritystandards-ar21.svg';
import socialTablesLogo from '../assets/socialtables-ar21.svg';
import viteLogo from '../assets/vitejsdev-ar21.svg';
import supabaseLogo from '../assets/8xHF2DW9QR2diK7qLaVS.svg';

import creditCardIcon from '../assets/credit-card.png';
import verifiedIcon from '../assets/verified.png';
import simplifyIcon from '../assets/simplify.png';

import designIcon from '../assets/icons/design.svg';
import marketingIcon from '../assets/icons/marketing.svg';
import businessIcon from '../assets/icons/business.svg';
import audioIcon from '../assets/icons/audio.svg';
import devIcon from '../assets/icons/dev.svg';
import writingIcon from '../assets/icons/writing.svg';
import socialIcon from '../assets/icons/social.svg';
import coachingIcon from '../assets/icons/coaching.svg';
import dailyIcon from '../assets/icons/daily.svg';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sellerCount, setSellerCount] = useState<number>(0);
  const [recentServices, setRecentServices] = useState<any[]>([]);

  useEffect(() => {
    const fetchSellerCount = async () => {
      try {
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_seller', true);
        
        if (error) throw error;
        setSellerCount(count || 0);
      } catch (err) {
        console.error("Erreur lors de la récupération du nombre de vendeurs", err);
      }
    };

    const fetchRecentServices = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select(`
            *,
            seller:profiles!services_seller_id_fkey(full_name, avatar_url)
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) throw error;
        if (data) {
          setRecentServices(data);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des services récents", err);
      }
    };

    fetchSellerCount();
    fetchRecentServices();
  }, []);

  const categoryCards = [
    { name: 'Design & Graphisme', iconImg: designIcon, slug: 'design-graphisme' },
    { name: 'Marketing digital', iconImg: marketingIcon, slug: 'marketing-digital' },
    { name: 'Business', iconImg: businessIcon, slug: 'business' },
    { name: 'Audiovisuel', iconImg: audioIcon, slug: 'audiovisuel' },
    { name: 'Site & Développement', iconImg: devIcon, slug: 'site-developpement' },
    { name: 'Rédaction', iconImg: writingIcon, slug: 'redaction' },
    { name: 'Réseaux sociaux', iconImg: socialIcon, slug: 'reseaux-sociaux' },
    { name: 'Formations & Coaching', iconImg: coachingIcon, slug: 'formations-coaching' },
    { name: 'Vie quotidienne', iconImg: dailyIcon, slug: 'vie-quotidienne' },
  ];

  const featuredFreelances = [
    {
      name: 'Sarah M.',
      role: 'Graphiste & DA',
      sales: 450,
      rating: 5.0,
      image: sarahImg,
    },
    {
      name: 'Thomas D.',
      role: 'Développeur React',
      sales: 239,
      rating: 4.9,
      image: thomasImg,
    },
    {
      name: 'Léa C.',
      role: 'Monteuse Vidéo',
      sales: 1200,
      rating: 5.0,
      image: leaImg,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* HERO SECTION - Style ComeUp */}
      <section className="relative bg-frilya-900 text-white overflow-hidden py-20 md:py-32">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-frilya-600/30 via-frilya-900 to-frilya-900"></div>
        <div className="absolute -right-40 -top-40 w-96 h-96 bg-frilya-600/20 blur-3xl rounded-full"></div>
        
        <div className="container mx-auto px-4 relative z-10 flex flex-col lg:flex-row items-center gap-12">
          
          {/* Left Text & Search */}
          <div className="flex-1 w-full max-w-2xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex -space-x-2">
                <img src={sarahImg} className="w-8 h-8 rounded-full border-2 border-frilya-900 object-cover object-top" alt="Freelance" />
                <img src={thomasImg} className="w-8 h-8 rounded-full border-2 border-frilya-900 object-cover object-top" alt="Freelance" />
                <img src={leaImg} className="w-8 h-8 rounded-full border-2 border-frilya-900 object-cover object-top" alt="Freelance" />
              </div>
              <span className="text-sm font-medium text-frilya-200">
                {sellerCount > 0 ? `${sellerCount} freelances disponibles` : 'De nombreux freelances disponibles'}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
              La plateforme freelance française pour réaliser <span className="text-frilya-400">tous vos projets</span>
            </h1>
            
            <p className="text-lg text-frilya-100 mb-8 max-w-xl leading-relaxed">
              Confiez votre projet à l'un de nos freelances soigneusement sélectionnés. Plus d'1 million de services livrés avec succès.
            </p>

            {/* Search Bar */}
            <div className="bg-white rounded-2xl p-2 flex flex-col md:flex-row gap-2 shadow-2xl">
              <div className="flex-1 flex items-center bg-white px-4 py-2 rounded-xl">
                <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Que recherchez-vous ? (ex: Logo, SEO...)"
                  className="w-full text-slate-900 bg-transparent outline-none placeholder:text-slate-400 font-medium"
                />
              </div>
              <Link 
                to={`/recherche?q=${searchQuery}`}
                className="bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3.5 px-8 rounded-xl transition-colors whitespace-nowrap text-center"
              >
                Rechercher
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-frilya-200">
                <span className="font-bold">Populaire :</span>
                {categoryCards.slice(0, 3).map(cat => (
                  <Link key={cat.name} to={`/recherche?category=${cat.slug}`} className="hover:text-white hover:underline transition-all">
                    {cat.name}
                  </Link>
                ))}
              </div>
          </div>

          {/* Right Cards (Featured Freelances) */}
          <div className="flex-1 hidden lg:flex relative h-[500px] w-full">
            {featuredFreelances.map((freelance, idx) => (
              <div 
                key={freelance.name}
                className={`absolute bg-white text-slate-900 rounded-3xl p-4 shadow-2xl transform transition-transform hover:scale-105 hover:z-20 cursor-pointer w-64
                  ${idx === 0 ? 'top-10 left-0 -rotate-6 z-10' : ''}
                  ${idx === 1 ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-3 z-20' : ''}
                  ${idx === 2 ? 'bottom-10 right-0 -rotate-3 z-10' : ''}
                `}
              >
                <div className="aspect-square rounded-2xl overflow-hidden mb-4 bg-slate-100">
                  <img src={freelance.image} alt={freelance.name} className="w-full h-full object-cover object-top" />
                </div>
                <h3 className="font-bold text-lg leading-tight">{freelance.name}</h3>
                <p className="text-sm text-slate-500 mb-2 truncate">{freelance.role}</p>
                <div className="flex items-center gap-1 text-sm font-bold">
                  <Star className="w-4 h-4 text-amber-500 fill-current" />
                  {freelance.rating} <span className="text-slate-400 font-normal">({freelance.sales} ventes)</span>
                </div>
              </div>
            ))}
          </div>
          
        </div>
      </section>

      {/* TRUST BANNER */}
      <section className="bg-white py-10 border-b border-slate-100">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16">
          <span className="text-slate-400 font-bold tracking-widest uppercase text-sm whitespace-nowrap">Ils nous font confiance</span>
          <div className="flex flex-wrap justify-center gap-10 md:gap-14 items-center">
            <img src={stripeLogo} alt="Stripe" className="h-8 md:h-10 object-contain opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300" />
            <img src={pciLogo} alt="PCI Security" className="h-8 md:h-10 object-contain opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300" />
            <img src={socialTablesLogo} alt="Social Tables" className="h-7 md:h-9 object-contain opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300" />
            <img src={viteLogo} alt="ViteJS" className="h-8 md:h-10 object-contain opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300" />
            <img src={supabaseLogo} alt="Supabase" className="h-7 md:h-9 object-contain opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300" />
          </div>
        </div>
      </section>

      {/* CATEGORIES SECTION */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">
            Explorez par catégorie
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categoryCards.map((cat) => (
              <Link 
                key={cat.name} 
                to={`/recherche?category=${cat.slug}`}
                className="group flex flex-col items-center justify-center p-6 bg-slate-50 rounded-3xl hover:bg-frilya-50 border border-transparent hover:border-frilya-100 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform bg-white rounded-2xl shadow-sm flex items-center justify-center">
                  <img src={cat.iconImg} alt={cat.name} className="w-7 h-7" />
                </div>
                <span className="font-bold text-slate-700 text-center text-sm">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* RECENT SERVICES SECTION */}
      {recentServices.length > 0 && (
        <section className="py-20 bg-slate-50 border-t border-slate-100">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">
              Derniers services ajoutés
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {recentServices.map(service => (
                <Link key={service.id} to={`/service/${service.slug || service.id}`} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 group flex flex-col">
                  <div className="aspect-video bg-slate-100 relative overflow-hidden">
                    {service.cover_image_url ? (
                      <img src={service.cover_image_url} alt={service.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">Pas d'image</div>
                    )}
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-900">
                      Nouveau
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                        {service.seller?.avatar_url ? (
                          <img src={service.seller.avatar_url} alt={service.seller.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-frilya-100 flex items-center justify-center text-frilya-700 font-bold text-xs">
                            {service.seller?.full_name?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-slate-700 text-sm truncate">{service.seller?.full_name || 'Utilisateur'}</span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 mb-4 line-clamp-2 group-hover:text-frilya-600 transition-colors">
                      {service.title}
                    </h3>
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500">À partir de</span>
                      <span className="font-bold text-xl text-slate-900">{service.price_basic} €</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* REASSURANCE SECTION */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Pourquoi choisir Frilya ?
            </h2>
            <p className="text-slate-600 text-lg">
              Une plateforme conçue pour la simplicité et la sécurité, 100% française.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-6">
              <div className="bg-frilya-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <img src={creditCardIcon} alt="Paiement sécurisé" className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg mb-2">Paiement 100% sécurisé</h3>
              <p className="text-slate-600 text-sm">Vos fonds sont conservés en sécurité jusqu'à la validation de votre commande.</p>
            </div>
            <div className="text-center p-6">
              <div className="bg-frilya-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <img src={verifiedIcon} alt="Freelance vérifié" className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg mb-2">Freelance vérifié</h3>
              <p className="text-slate-600 text-sm">Chaque profil est contrôlé manuellement par notre équipe française.</p>
            </div>
            <div className="text-center p-6">
              <div className="bg-frilya-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <img src={simplifyIcon} alt="Simplicité absolue" className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg mb-2">Simplicité absolue</h3>
              <p className="text-slate-600 text-sm">Trouvez, commandez et échangez sans jargon technique ni processus complexe.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="bg-frilya-900 rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-frilya-600/40 to-transparent opacity-50"></div>
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Prêt à donner vie à vos idées ?
              </h2>
              <p className="text-lg text-frilya-100 mb-10">
                Rejoignez la communauté Frilya dès aujourd'hui. Que vous soyez acheteur ou freelance, votre place est ici.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/connexion" className="bg-white text-frilya-900 hover:bg-slate-50 font-bold py-4 px-8 rounded-xl transition-colors shadow-lg">
                  Trouver un freelance
                </Link>
                <Link to="/vendeur/inscription" className="bg-transparent border border-white/30 hover:bg-white/10 text-white font-bold py-4 px-8 rounded-xl transition-colors">
                  Devenir vendeur
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}