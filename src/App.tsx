import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Heart, Download, CheckCircle, X, Server, Code, Crown, Star, Zap, ShieldCheck, Lock } from 'lucide-react';
import jsPDF from 'jspdf';
import { supabase } from './lib/supabase';
import logo from './assets/logo.png';

// Clé publique Stripe
const stripePromise = loadStripe('pk_live_51Sr1HLCs5mrUe8SK0iyQYCu3YnamJqg201mb2OHoNWbCp2FjBZr5THWSALzhj1RokspGYUl7IEMvr6K9M1KsCY7200VHU7oucA');

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
  </svg>
);

function Home() {
  const [donationAmount, setDonationAmount] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [isWidgetOpen, setIsWidgetOpen] = useState(true);

  // Calcul des frais Stripe: 1.5% + 0.25€
  const calculateTotal = (net: number) => {
    const total = (net + 0.25) / 0.985;
    return Math.ceil(total * 100) / 100;
  };

  const totalAmount = calculateTotal(donationAmount);
  const fees = Math.round((totalAmount - donationAmount) * 100) / 100;

  const handleDonate = async () => {
    setLoading(true);
    try {
      const apiUrl = '/api/checkout';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: totalAmount,
          success_url: window.location.origin + '/?success=true&session_id={CHECKOUT_SESSION_ID}',
          cancel_url: window.location.origin + '/',
        }),
      });

      const session = await response.json();

      if (session.error) {
        throw new Error(session.error);
      }

      if (session.url) {
        window.location.href = session.url;
      } else {
        const stripe = await stripePromise;
        // @ts-ignore
        await stripe?.redirectToCheckout({
          sessionId: session.id,
        });
      }
    } catch (error) {
      console.error('Erreur lors de la redirection vers Stripe:', error);
      alert("Une erreur est survenue lors de l'initialisation du paiement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-frilya-100 selection:text-frilya-900 pb-32">
      {/* Header Corporate */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center">
            <img src={logo} alt="Frilya" className="h-10 w-auto" />
          </div>
          <a 
            href="https://discord.gg/3nmBgXX5Ef" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-2 text-sm font-bold text-frilya-900 hover:text-[#5865F2] transition-colors bg-slate-50 hover:bg-indigo-50 px-4 py-2.5 rounded-full border border-slate-200 hover:border-[#5865F2]/30"
          >
            <DiscordIcon className="w-5 h-5 text-[#5865F2]" />
            Rejoindre Discord
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Header Article */}
          <div className="px-8 md:px-12 pt-12 pb-8 border-b border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-frilya-900 via-frilya-600 to-frilya-500"></div>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-frilya-50 p-2 rounded-xl border border-frilya-100 flex items-center justify-center">
                <img src={logo} alt="Frilya" className="h-6 w-auto object-contain" />
              </div>
              <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Note du fondateur</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              <span className="text-xs font-bold tracking-widest text-frilya-600 uppercase">Août 2026</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-4">
              Refonte de l'infrastructure
            </h1>
            <p className="text-lg text-slate-500 font-medium">
              Pourquoi nous faisons le choix de l'indépendance technologique pour l'avenir de la plateforme.
            </p>
          </div>

          {/* Body Article */}
          <div className="px-8 md:px-12 py-10 space-y-8 text-slate-600 text-lg leading-relaxed">
            <p className="text-xl text-slate-800 font-medium leading-snug">
              Bonjour à tous. Je viens vous tenir informés concernant l'évolution de Frilya. J'ai pris une décision radicale : <strong className="text-frilya-900">nous effaçons tout et nous recommençons.</strong>
            </p>

            <div className="flex items-center gap-4 py-2">
              <div className="h-px bg-slate-100 flex-1"></div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Le Constat</h2>
              <div className="h-px bg-slate-100 flex-1"></div>
            </div>

            <p>
              Au départ, j'avais développé le site via un outil « no-code » (Zite). Cela m'a fait gagner un temps précieux et la plateforme était presque prête. Mais une réalité technique s'est imposée : le « vibe coding » a ses limites.
            </p>
            <p>
              Nous étions totalement dépendants de leur écosystème. Par exemple, le système de connexion leur était propre et impossible à modifier. Une contrainte inacceptable pour garantir votre sécurité et la pérennité du projet.
            </p>

            <div className="my-10 bg-frilya-50/50 border border-frilya-100 rounded-2xl p-8 relative overflow-hidden shadow-inner">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-frilya-600"></div>
              <h3 className="text-lg font-bold text-frilya-900 mb-3 flex items-center gap-2">
                <Code className="w-5 h-5 text-frilya-600" />
                La Décision
              </h3>
              <p className="text-slate-700 font-medium m-0">
                J'ai donc décidé de <strong className="text-frilya-600">développer la plateforme moi-même</strong>, avec des outils professionnels. Cela demandera plus de temps et d'investissement financier, mais c'est la seule voie pour que Frilya voit le jour de manière solide et sur-mesure.
              </p>
            </div>

            <div className="flex items-center gap-4 py-2">
              <div className="h-px bg-slate-100 flex-1"></div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">La Suite</h2>
              <div className="h-px bg-slate-100 flex-1"></div>
            </div>

            <p>
              <strong>Quand ?</strong> La date de sortie reste à définir. Je suis actuellement pris dans un grand déménagement imprévu à plus de 1000 km, ce qui retarde logiquement le calendrier.
            </p>
            
            <div className="mt-8 flex items-start gap-4">
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-full shrink-0">
                <Heart className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-slate-500 italic text-base m-0 pt-2">
                Merci infiniment pour votre patience et votre soutien. Je n'abandonne pas le projet, bien au contraire.
              </p>
            </div>
          </div>

          {/* Footer Article */}
          <div className="bg-slate-50 p-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-slate-900 font-bold mb-1">Restez informé</h3>
              <p className="text-sm text-slate-500">Rejoignez la communauté pour suivre l'avancée.</p>
            </div>
            <a 
              href="https://discord.gg/3nmBgXX5Ef" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full md:w-auto inline-flex items-center justify-center gap-3 bg-white hover:bg-[#5865F2] text-slate-700 hover:text-white font-bold py-3 px-6 rounded-xl transition-all border border-slate-200 hover:border-[#5865F2] shadow-sm hover:shadow-[#5865F2]/25 group"
            >
              <DiscordIcon className="w-5 h-5 text-[#5865F2] group-hover:text-white transition-colors" />
              Rejoindre Discord
            </a>
          </div>
        </div>
      </main>

      {/* Footer Lexique */}
      <footer className="container mx-auto px-4 text-center pb-8">
        <p className="text-sm text-slate-400 italic flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          *plateforme = Notre site internet (frilya.com)
        </p>
      </footer>

      {/* Widget Donation (Fixed Bottom Right) */}
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end">
        
        {/* Panneau Dépliant */}
        <div className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-bottom-right ${isWidgetOpen ? 'scale-100 opacity-100 translate-y-0 mb-4' : 'scale-95 opacity-0 translate-y-10 pointer-events-none absolute'}`}>
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/60 w-[calc(100vw-2rem)] md:w-[420px] overflow-hidden flex flex-col max-h-[85vh] ring-1 ring-black/5">
            
            {/* Header Widget */}
            <div className="bg-frilya-900 p-5 flex justify-between items-center text-white shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-frilya-600/40 to-transparent opacity-50"></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                  <ShieldCheck className="w-5 h-5 text-frilya-100" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-wide leading-tight">Soutenir Frilya</h3>
                  <p className="text-xs text-blue-200 font-medium">Paiement 100% sécurisé</p>
                </div>
              </div>
              <button 
                onClick={() => setIsWidgetOpen(false)} 
                className="relative z-10 text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Corps Widget (Scrollable) */}
            <div className="p-6 overflow-y-auto flex-grow custom-scrollbar">
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Votre soutien financier permet de garantir l'indépendance de Frilya et le paiement des infrastructures serveurs.
              </p>

              {/* Avantages VIP */}
              <div className="space-y-3.5 mb-8 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-bold text-frilya-900 uppercase tracking-wider mb-3">Vos avantages exclusifs</h4>
                
                <div className="flex items-start gap-3">
                  <Server className="w-4 h-4 text-frilya-600 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700">Financement d'un <strong>serveur</strong> pour héberger la plateforme*</span>
                </div>
                <div className="flex items-start gap-3">
                  <Code className="w-4 h-4 text-frilya-600 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700">Développement serein via des <strong>outils pro</strong></span>
                </div>
                <div className="flex items-start gap-3">
                  <Crown className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700"><strong>Statut donateur</strong> et <strong>avantages VIP</strong></span>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-4 h-4 text-frilya-600 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700">Priorité sur la <strong>beta</strong> & le <strong>recrutement</strong></span>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="w-4 h-4 text-frilya-600 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700">Priorité sur les <strong>avant-premières de MAJ</strong></span>
                </div>
              </div>

              {/* Calculateur */}
              <div className="bg-white rounded-2xl">
                <label className="block text-sm font-bold text-slate-900 mb-3">
                  Montant de votre don net (€)
                </label>
                
                <input 
                  type="range" 
                  min="5" 
                  max="1000" 
                  step="5" 
                  value={donationAmount} 
                  onChange={(e) => setDonationAmount(Number(e.target.value))} 
                  className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-frilya-600 mb-5" 
                />
                
                <div className="relative mb-5">
                  <input 
                    type="number" 
                    min="5" 
                    max="1000" 
                    value={donationAmount} 
                    onChange={(e) => { 
                      let val = Number(e.target.value); 
                      if(val>1000) val=1000; 
                      setDonationAmount(val); 
                    }} 
                    className="block w-full rounded-xl border-slate-200 bg-slate-50 pl-4 pr-12 py-3.5 text-xl font-bold text-frilya-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 focus:bg-white transition-all shadow-sm" 
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-5 pointer-events-none">
                    <span className="text-slate-400 font-bold text-lg">€</span>
                  </div>
                </div>

                <div className="space-y-2.5 text-sm text-slate-500 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between">
                    <span>Don net pour Frilya</span>
                    <span className="font-medium text-slate-700">{donationAmount.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frais Stripe (1.5% + 0.25€)</span>
                    <span className="font-medium text-slate-700">{fees.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-frilya-900 pt-3 mt-1 border-t border-slate-200">
                    <span>Total à régler</span>
                    <span>{totalAmount.toFixed(2)} €</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 mt-4 text-xs font-medium text-slate-500 bg-green-50/50 p-2.5 rounded-lg border border-green-100">
                  <Lock className="w-4 h-4 text-green-600 shrink-0" />
                  Transaction chiffrée de bout en bout par Stripe
                </div>
              </div>

              <div className="mt-6">
                <button 
                  onClick={handleDonate} 
                  disabled={loading || donationAmount < 5 || donationAmount > 1000} 
                  className="w-full flex justify-center items-center gap-2 bg-frilya-600 hover:bg-frilya-500 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-lg hover:shadow-frilya-600/30 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <span className="animate-pulse">Connexion sécurisée...</span>
                  ) : (
                    <>
                      <Heart className="w-5 h-5 text-white fill-current group-hover:scale-110 transition-transform" /> 
                      Valider mon soutien de {totalAmount.toFixed(2)} €
                    </>
                  )}
                </button>
                {donationAmount < 5 && (
                  <p className="text-red-500 text-xs text-center mt-2 font-medium">Le don minimum est de 5 €</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bouton Flottant (Visible quand le widget est fermé) */}
        <button 
          onClick={() => setIsWidgetOpen(true)} 
          className={`transition-all duration-300 ease-out transform ${!isWidgetOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-75 translate-y-10 opacity-0 pointer-events-none absolute'} bg-frilya-900 hover:bg-frilya-800 text-white shadow-2xl shadow-frilya-900/30 rounded-full py-4 px-7 flex items-center gap-3 font-bold border border-frilya-700`}
        >
          <Heart className="w-5 h-5 text-red-500 fill-current animate-pulse" />
          Soutenir le projet
        </button>
      </div>
    </div>
  );
}

function Success() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    const fetchSessionAndSave = async () => {
      if (!sessionId) return;
      
      try {
        const apiUrl = `/api/session?session_id=${sessionId}`;
        const res = await fetch(apiUrl);
        const data = await res.json();
        setSessionData(data);

        if (data && data.payment_status === 'paid') {
          const { error } = await supabase.from('donations').insert({
            stripe_session_id: data.id,
            amount_total: data.amount_total / 100,
            currency: data.currency,
            donor_email: data.customer_details?.email || null,
            donor_name: data.customer_details?.name || null,
            status: data.payment_status
          });
          
          if (error && error.code !== '23505') {
            console.error('Erreur lors de la sauvegarde dans Supabase:', error);
          }
        }
      } catch (err) {
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionAndSave();
  }, [sessionId]);

  const generatePDF = () => {
    if (!sessionData) return;
    
    const doc = new jsPDF();
    const amount = (sessionData.amount_total / 100).toFixed(2);
    const date = new Date().toLocaleDateString('fr-FR');
    const email = sessionData.customer_details?.email || 'Non renseigné';
    const name = sessionData.customer_details?.name || 'Donateur';

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(1, 17, 66); // frilya-900
    doc.text("Frilya", 105, 30, { align: "center" });
    
    doc.setFontSize(16);
    doc.setTextColor(2, 49, 189); // frilya-600
    doc.text("Certificat de Donateur VIP", 105, 40, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Date d'émission : ${date}`, 105, 50, { align: "center" });
    
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(20, 60, 190, 60);

    doc.setTextColor(1, 17, 66); // frilya-900
    doc.setFont("helvetica", "bold");
    doc.text("Informations du donateur", 20, 80);
    doc.setFont("helvetica", "normal");
    doc.text(`Nom complet : ${name}`, 20, 90);
    doc.text(`Adresse email : ${email}`, 20, 100);

    doc.setFont("helvetica", "bold");
    doc.text("Détails de la transaction sécurisée", 20, 120);
    doc.setFont("helvetica", "normal");
    doc.text(`Montant total : ${amount} €`, 20, 130);
    doc.text(`Identifiant Stripe : ${sessionData.id}`, 20, 140);
    doc.text(`Statut : Confirmé et Payé`, 20, 150);

    doc.setDrawColor(226, 232, 240);
    doc.line(20, 165, 190, 165);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(1, 17, 66); // frilya-900
    doc.text("Merci infiniment pour votre soutien !", 105, 185, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Conservez ce document précieusement. Il fait office de preuve pour", 105, 195, { align: "center" });
    doc.text("activer vos avantages VIP lors de l'ouverture officielle de la plateforme.", 105, 200, { align: "center" });

    doc.save(`Frilya_Certificat_VIP_${date.replace(/\//g, '-')}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-frilya-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-sans selection:bg-frilya-100">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-green-50 p-4 rounded-full">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-frilya-900 mb-2">Merci beaucoup !</h1>
          <p className="text-slate-600 leading-relaxed">
            Votre don a été traité avec succès. Grâce à vous, Frilya va pouvoir continuer son développement dans les meilleures conditions.
          </p>
        </div>
        
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">Montant de votre soutien</p>
          <p className="text-3xl font-bold text-frilya-900">
            {sessionData ? (sessionData.amount_total / 100).toFixed(2) : '...'} €
          </p>
        </div>

        <button
          onClick={generatePDF}
          className="w-full flex justify-center items-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl group"
        >
          <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
          Télécharger mon certificat VIP
        </button>
        
        <p className="text-sm text-slate-400 italic">
          Document PDF à conserver pour vos futurs avantages.
        </p>
        
        <div className="pt-6 border-t border-slate-100">
          <a href="/" className="text-frilya-600 hover:text-frilya-700 font-bold transition-colors">
            ← Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/success" element={<Success />} />
      </Routes>
    </Router>
  );
}

export default function AppWrapper() {
  const isSuccess = new URLSearchParams(window.location.search).get('success') === 'true';
  
  if (isSuccess) {
    return (
      <Router>
        <Success />
      </Router>
    );
  }

  return <App />;
}