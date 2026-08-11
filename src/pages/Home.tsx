import { Link } from 'react-router-dom';
import { Search, Star, ShieldCheck, Zap, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Icons imports
import artIcon from '../assets/art.png';
import videoIcon from '../assets/video.png';
import scriptIcon from '../assets/script.png';
import copyWritingIcon from '../assets/copy-writing.png';
import seoIcon from '../assets/map-with-a-pin-small-symbol-inside-a-circle.png';
import advertisingIcon from '../assets/advertising.png';

import sarahImg from '../assets/Sarah.png';
import thomasImg from '../assets/Thomas.png';
import leaImg from '../assets/Léa.png';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sellerCount, setSellerCount] = useState<number>(0);

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

    fetchSellerCount();
  }, []);

  const categories = [
    { name: 'Logo', icon: artIcon },
    { name: 'Montage vidéo', icon: videoIcon },
    { name: 'Développement web', icon: scriptIcon },
    { name: 'Rédaction', icon: copyWritingIcon },
    { name: 'SEO', icon: seoIcon },
    { name: 'Community Management', icon: advertisingIcon },
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
                to={`/search?q=${searchQuery}`}
                className="bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3.5 px-8 rounded-xl transition-colors whitespace-nowrap text-center"
              >
                Rechercher
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-frilya-200">
              <span className="font-bold">Populaire :</span>
              {categories.slice(0, 3).map(cat => (
                <Link key={cat.name} to={`/search?q=${cat.name}`} className="hover:text-white hover:underline transition-all">
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
      <section className="bg-slate-900 py-6 border-b border-slate-800">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-center items-center gap-6 md:gap-12 opacity-70 grayscale">
          <span className="text-white font-bold tracking-widest uppercase text-sm">Ils nous font confiance</span>
          {/* Placeholders for logos */}
          <div className="flex flex-wrap justify-center gap-8 items-center">
            <span className="text-white font-serif font-bold text-xl italic">PayPal</span>
            <span className="text-white font-sans font-bold text-xl tracking-tighter">shopify</span>
            <span className="text-white font-sans font-extrabold text-xl">swello</span>
            <span className="text-white font-serif font-bold text-xl">Europe 1</span>
          </div>
        </div>
      </section>

      {/* CATEGORIES SECTION */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">
            Explorez par catégorie
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link 
                key={cat.name} 
                to={`/search?category=${cat.name}`}
                className="group flex flex-col items-center justify-center p-6 bg-slate-50 rounded-3xl hover:bg-frilya-50 border border-transparent hover:border-frilya-100 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform">
                  <img src={cat.icon} alt={cat.name} className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-slate-700 text-center text-sm">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-frilya-100 text-frilya-600 rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Paiement Sécurisé</h3>
              <p className="text-slate-600">
                Votre argent est bloqué sur un compte séquestre. Le freelance n'est payé que lorsque vous validez le travail.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-frilya-100 text-frilya-600 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Talents Vérifiés</h3>
              <p className="text-slate-600">
                Nous vérifions l'identité de chaque vendeur français pour vous garantir un travail de qualité.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-frilya-100 text-frilya-600 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Simplicité Absolue</h3>
              <p className="text-slate-600">
                Trouvez, commandez et recevez votre projet sans friction. Une interface pensée pour aller à l'essentiel.
              </p>
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
                <Link to="/auth" className="bg-white text-frilya-900 hover:bg-slate-50 font-bold py-4 px-8 rounded-xl transition-colors shadow-lg">
                  Trouver un freelance
                </Link>
                <Link to="/vendeur/onboarding" className="bg-transparent border border-white/30 hover:bg-white/10 text-white font-bold py-4 px-8 rounded-xl transition-colors">
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