import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Heart, MessageSquare, Download, CheckCircle, X, Server, Code, Crown, Star, Zap, Info, ShieldCheck } from 'lucide-react';
import jsPDF from 'jspdf';
import { supabase } from './lib/supabase';

// Clé publique Stripe
const stripePromise = loadStripe('pk_live_51Sr1HLCs5mrUe8SK0iyQYCu3YnamJqg201mb2OHoNWbCp2FjBZr5THWSALzhj1RokspGYUl7IEMvr6K9M1KsCY7200VHU7oucA');

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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-32">
      {/* Header Corporate */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Frilya</h1>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Communauté</span>
            </div>
          </div>
          <a 
            href="https://discord.gg/3nmBgXX5Ef" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#5865F2] transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Discord
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 px-8 py-12 text-center relative overflow-hidden">
            {/* Abstract Background element */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-2xl opacity-10 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 blur-3xl rounded-full mix-blend-screen"></div>
            </div>
            
            <div className="relative z-10">
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
                Mise à jour du projet
              </h1>
              <p className="text-indigo-200 text-lg md:text-xl font-medium max-w-xl mx-auto">
                Une nouvelle direction pour une plateforme indépendante et pérenne.
              </p>
            </div>
          </div>

          <div className="p-8 md:p-12 space-y-6 text-slate-600 text-lg leading-relaxed">
            <p className="font-bold text-slate-900 text-xl">Bonjour @everyone,</p>
            <p>
              Je viens vous tenir au courant concernant Frilya, et j'ai pris une décision radicale : <strong className="text-slate-900">on efface tout et on recommence.</strong> 😅
            </p>
            
            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-6 flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Info className="w-6 h-6 text-indigo-600" />
              </div>
              Quoi, pourquoi ?
            </h2>
            
            <p>
              Au départ, j'avais codé le site via un outil de « no code » qui s'appelle Zite. Ça m'a fait gagner du temps, ça ne m'a pas coûté grand-chose et le site était là, prêt ou presque. Mais voilà :
            </p>
            <p>
              Zite, c'est du « vibe coding », jusqu'ici, pourquoi pas. Mais c'est surtout être dépendant de leur système. Par exemple, le système de connexion est propre à Zite et je ne peux pas le modifier. Un peu relou... 😅
            </p>
            
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 my-8">
              <p className="text-slate-700 font-medium">
                J'ai donc pris la décision de <strong className="text-indigo-600">le faire moi-même</strong>. Ça va prendre plus de temps et ça va également me demander plus d'argent, mais Frilya verra le jour ! 💪
              </p>
            </div>

            <p>
              Quand ? Je ne sais pas encore. Je suis actuellement pris dans un grand déménagement de dernière minute : je déménage à plus de 1000 km et ce n'était absolument pas prévu...
            </p>
            
            <div className="mt-10 flex items-start gap-4 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
              <Heart className="w-8 h-8 text-red-500 fill-current shrink-0 mt-1" />
              <p className="text-slate-800 font-medium text-lg">
                Alors merci pour votre patience et votre temps. Et promis, je n'abandonne pas le projet, loin de là !
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-8 border-t border-slate-100 flex flex-col items-center justify-center text-center">
            <h3 className="text-slate-900 font-bold mb-4">Restez informé de l'avancée du projet</h3>
            <a 
              href="https://discord.gg/3nmBgXX5Ef" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:-translate-y-1 shadow-lg hover:shadow-indigo-500/25"
            >
              <MessageSquare className="w-6 h-6" />
              Rejoindre notre Discord
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
            <div className="bg-slate-900 p-5 flex justify-between items-center text-white shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-transparent opacity-50"></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="bg-indigo-500/20 p-2 rounded-xl backdrop-blur-sm">
                  <Heart className="w-5 h-5 text-indigo-400 fill-current" />
                </div>
                <h3 className="font-bold text-lg tracking-wide">Soutenir Frilya</h3>
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
                Vous souhaitez soutenir le projet ? Ce n'est pas obligatoire mais cela nous aiderait vraiment à avancer !
              </p>

              {/* Avantages VIP */}
              <div className="space-y-3.5 mb-8 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Vos avantages exclusifs</h4>
                
                <div className="flex items-start gap-3">
                  <Server className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700">Financement d'un <strong>serveur</strong> pour héberger la plateforme*</span>
                </div>
                <div className="flex items-start gap-3">
                  <Code className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700">Développement serein via des <strong>outils pro</strong></span>
                </div>
                <div className="flex items-start gap-3">
                  <Crown className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700"><strong>Statut donateur</strong> et <strong>avantages VIP</strong></span>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700">Priorité sur la <strong>beta</strong> & le <strong>recrutement</strong></span>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700">Priorité sur les <strong>avant-premières de MAJ</strong></span>
                </div>
              </div>

              {/* Calculateur */}
              <div className="bg-white rounded-2xl">
                <label className="block text-sm font-bold text-slate-900 mb-3">
                  Montant du don net (€)
                </label>
                
                <input 
                  type="range" 
                  min="5" 
                  max="1000" 
                  step="5" 
                  value={donationAmount} 
                  onChange={(e) => setDonationAmount(Number(e.target.value))} 
                  className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600 mb-5" 
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
                    className="block w-full rounded-xl border-slate-200 bg-slate-50 pl-4 pr-12 py-3.5 text-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" 
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
                  <div className="flex justify-between font-bold text-lg text-slate-900 pt-3 mt-1 border-t border-slate-200">
                    <span>Total à régler</span>
                    <span>{totalAmount.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button 
                  onClick={handleDonate} 
                  disabled={loading || donationAmount < 5 || donationAmount > 1000} 
                  className="w-full flex justify-center items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <span className="animate-pulse">Redirection sécurisée...</span>
                  ) : (
                    <>
                      <Heart className="w-5 h-5 text-indigo-400 fill-current group-hover:scale-110 transition-transform" /> 
                      Valider mon don de {totalAmount.toFixed(2)} €
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
          className={`transition-all duration-300 ease-out transform ${!isWidgetOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-75 translate-y-10 opacity-0 pointer-events-none absolute'} bg-slate-900 hover:bg-slate-800 text-white shadow-2xl shadow-slate-900/20 rounded-full py-4 px-7 flex items-center gap-3 font-bold border border-slate-700`}
        >
          <Heart className="w-5 h-5 text-indigo-400 fill-current animate-pulse" />
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
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("Frilya", 105, 30, { align: "center" });
    
    doc.setFontSize(16);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text("Certificat de Donateur VIP", 105, 40, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Date d'émission : ${date}`, 105, 50, { align: "center" });
    
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(20, 60, 190, 60);

    doc.setTextColor(15, 23, 42);
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
    doc.setTextColor(15, 23, 42);
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
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-sans selection:bg-indigo-100">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-green-50 p-4 rounded-full">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Merci beaucoup !</h1>
          <p className="text-slate-600 leading-relaxed">
            Votre don a été traité avec succès. Grâce à vous, Frilya va pouvoir continuer son développement dans les meilleures conditions.
          </p>
        </div>
        
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">Montant de votre soutien</p>
          <p className="text-3xl font-bold text-slate-900">
            {sessionData ? (sessionData.amount_total / 100).toFixed(2) : '...'} €
          </p>
        </div>

        <button
          onClick={generatePDF}
          className="w-full flex justify-center items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl group"
        >
          <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
          Télécharger mon certificat VIP
        </button>
        
        <p className="text-sm text-slate-400 italic">
          Document PDF à conserver pour vos futurs avantages.
        </p>
        
        <div className="pt-6 border-t border-slate-100">
          <a href="/" className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors">
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