import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Heart, MessageSquare, Download, CheckCircle, ArrowRight } from 'lucide-react';
import jsPDF from 'jspdf';
import { supabase } from './lib/supabase';

// Clé publique Stripe
const stripePromise = loadStripe('pk_live_51Sr1HLCs5mrUe8SK0iyQYCu3YnamJqg201mb2OHoNWbCp2FjBZr5THWSALzhj1RokspGYUl7IEMvr6K9M1KsCY7200VHU7oucA');

function Home() {
  const [donationAmount, setDonationAmount] = useState<number>(5);
  const [loading, setLoading] = useState(false);

  // Calcul des frais Stripe: 1.5% + 0.25€
  // On veut que le montant net reçu par Frilya soit "donationAmount"
  // Donc: Total = (donationAmount + 0.25) / (1 - 0.015)
  const calculateTotal = (net: number) => {
    const total = (net + 0.25) / 0.985;
    return Math.ceil(total * 100) / 100;
  };

  const totalAmount = calculateTotal(donationAmount);
  const fees = Math.round((totalAmount - donationAmount) * 100) / 100;

  const handleDonate = async () => {
    setLoading(true);
    try {
      // Appel à notre script Vercel pour créer la session
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

      // Si on a l'URL de session, on redirige vers Stripe Checkout
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
      alert("Une erreur est survenue lors de l'initialisation du paiement. Si vous testez en local, assurez-vous que le backend PHP est lancé.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="bg-white shadow-sm p-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Frilya</h1>
        <p className="text-gray-500 mt-2">Mise à jour du projet</p>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl space-y-12">
        {/* Section Information */}
        <section className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Le mot du créateur</h2>
          <div className="prose prose-gray max-w-none space-y-4 text-gray-700 leading-relaxed">
            <p className="font-semibold text-lg">Bonjour @everyone,</p>
            <p>
              Je viens vous tenir au courant concernant Frilya, et j'ai pris une décision radicale : on efface tout et on recommence. 😅
            </p>
            <h3 className="text-xl font-bold text-gray-800 mt-6 mb-2">QUOI, POURQUOI ?</h3>
            <p>
              Au départ, j'avais codé le site via un outil de « no code » qui s'appelle Zite. Ça m'a fait gagner du temps, ça ne m'a pas coûté grand-chose et le site était là, prêt ou presque. Mais voilà :
            </p>
            <p>
              Zite, c'est du « vibe coding », jusqu'ici, pourquoi pas. Mais c'est surtout être dépendant de leur système. Par exemple, le système de connexion est propre à Zite et je ne peux pas le modifier. Un peu relou... 😅
            </p>
            <p>
              J'ai donc pris la décision de le faire moi-même. Ça va prendre plus de temps et ça va également me demander plus d'argent, mais Frilya verra le jour ! 💪
            </p>
            <p>
              Quand ? Je ne sais pas encore. Je suis actuellement pris dans un grand déménagement de dernière minute : je déménage à plus de 1000 km et ce n'était absolument pas prévu...
            </p>
            <p className="font-medium">
              Alors merci pour votre patience et votre temps. Et promis, je n'abandonne pas le projet, loin de là ! ❤️
            </p>
          </div>

          <div className="mt-10 flex justify-center">
            <a 
              href="https://discord.gg/3nmBgXX5Ef" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-4 px-8 rounded-full transition-all transform hover:scale-105 shadow-lg"
            >
              <MessageSquare className="w-6 h-6" />
              Rejoignez notre Discord pour ne pas manquer les news
            </a>
          </div>
        </section>

        {/* Section Donation */}
        <section className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl shadow-md p-8 border border-indigo-100">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-indigo-900 mb-4 flex items-center justify-center gap-2">
              <Heart className="w-8 h-8 text-red-500" fill="currentColor" />
              Soutenir le projet Frilya
            </h2>
            <p className="text-lg text-indigo-800 max-w-2xl mx-auto">
              Vous souhaitez soutenir le projet ? Avez-vous pensé à faire un don ? Ce n'est pas obligatoire mais cela nous aiderait vraiment !
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            {/* Avantages */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-indigo-900 mb-4">Grâce à votre don :</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Je pourrai <strong>financer un serveur</strong> pour héberger la plateforme*</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Continuer à <strong>développer sereinement</strong> via des outils payants</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Vous bénéficierez du <strong>statut donateur</strong> sur la plateforme et vous aurez des <strong>avantages VIP</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Vous serez <strong>prioritaire sur la beta</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Vous serez <strong>prioritaire sur le recrutement</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Vous serez <strong>prioritaire sur les avant-premières</strong> de MAJ</span>
                </li>
              </ul>
            </div>

            {/* Calculateur */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Montant du don</h3>
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                    Montant net pour Frilya (€)
                  </label>
                  <input
                    type="range"
                    id="amount-slider"
                    min="5"
                    max="1000"
                    step="5"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="mt-4 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      id="amount"
                      min="5"
                      max="1000"
                      value={donationAmount}
                      onChange={(e) => {
                        let val = Number(e.target.value);
                        if (val > 1000) val = 1000;
                        setDonationAmount(val);
                      }}
                      className="form-input block w-full rounded-md border-gray-300 pl-4 pr-12 py-3 text-lg focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <span className="text-gray-500 sm:text-lg">€</span>
                    </div>
                  </div>
                  {donationAmount < 5 && (
                    <p className="text-red-500 text-sm mt-1">Le don minimum est de 5 €</p>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm text-gray-600 border border-gray-100">
                  <div className="flex justify-between">
                    <span>Don pour Frilya</span>
                    <span className="font-medium text-gray-900">{donationAmount.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Frais de transaction Stripe*</span>
                    <span>{fees.toFixed(2)} €</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between font-bold text-lg text-gray-900">
                    <span>Total à payer</span>
                    <span>{totalAmount.toFixed(2)} €</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 leading-tight">
                    *Afin de garantir que Frilya reçoive l'intégralité de votre don, les frais de traitement Stripe (1,5% + 0,25€) sont répercutés sur le montant final.
                  </p>
                </div>

                <button
                  onClick={handleDonate}
                  disabled={loading || donationAmount < 5 || donationAmount > 1000}
                  className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {loading ? (
                    <span className="animate-pulse">Redirection en cours...</span>
                  ) : (
                    <>
                      <Heart className="w-5 h-5" />
                      Faire un don de {totalAmount.toFixed(2)} €
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 text-gray-400 py-8 text-center text-sm">
        <div className="container mx-auto px-4">
          <p className="mb-2">Merci pour votre soutien ! ❤️</p>
          <p className="italic">*plateforme = Notre site internet (frilya.com)</p>
        </div>
      </footer>
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
          // Save to Supabase
          const { error } = await supabase.from('donations').insert({
            stripe_session_id: data.id,
            amount_total: data.amount_total / 100,
            currency: data.currency,
            donor_email: data.customer_details?.email || null,
            donor_name: data.customer_details?.name || null,
            status: data.payment_status
          });
          
          if (error) {
            // Ignore unique constraint error if user refreshes page
            if (error.code !== '23505') {
              console.error('Erreur lors de la sauvegarde dans Supabase:', error);
            }
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

    // Style du PDF
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(31, 41, 55);
    doc.text("Frilya - Reçu de Don", 105, 30, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(`Date : ${date}`, 105, 40, { align: "center" });
    
    doc.setDrawColor(229, 231, 235);
    doc.line(20, 50, 190, 50);

    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.text("Informations du donateur :", 20, 70);
    doc.setFont("helvetica", "normal");
    doc.text(`Nom : ${name}`, 20, 80);
    doc.text(`Email : ${email}`, 20, 90);

    doc.setFont("helvetica", "bold");
    doc.text("Détails de la transaction :", 20, 110);
    doc.setFont("helvetica", "normal");
    doc.text(`Montant total : ${amount} €`, 20, 120);
    doc.text(`Numéro de transaction : ${sessionData.id}`, 20, 130);
    doc.text(`Statut : Payé`, 20, 140);

    doc.setDrawColor(229, 231, 235);
    doc.line(20, 150, 190, 150);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text("Merci infiniment pour votre soutien !", 105, 170, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text("Conservez ce document précieusement. Il vous servira de preuve pour", 105, 180, { align: "center" });
    doc.text("obtenir vos droits VIP et avantages lors de l'ouverture de la plateforme.", 105, 185, { align: "center" });

    doc.save(`Frilya_Recu_Don_${date.replace(/\//g, '-')}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="w-20 h-20 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Merci beaucoup !</h1>
        <p className="text-gray-600">
          Votre don a été traité avec succès. Grâce à vous, Frilya va pouvoir continuer son développement dans les meilleures conditions. ❤️
        </p>
        
        <div className="bg-green-50 p-4 rounded-lg border border-green-100 mb-6">
          <p className="font-medium text-green-800">
            Montant : {sessionData ? (sessionData.amount_total / 100).toFixed(2) : '...'} €
          </p>
        </div>

        <button
          onClick={generatePDF}
          className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md"
        >
          <Download className="w-5 h-5" />
          Télécharger mon reçu PDF
        </button>
        
        <p className="text-sm text-gray-500 italic">
          Conservez ce reçu pour obtenir vos avantages VIP à l'ouverture.
        </p>
        
        <div className="pt-6">
          <a href="/" className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline">
            Retour à l'accueil
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
        {/* On gère aussi ?success=true via Home ou on peut créer une vraie route. 
            Avec le useSearchParams, la route Home gérera aussi la redirection si on le souhaite, 
            mais on va rediriger vers /success si success=true est présent dans l'URL. */}
      </Routes>
    </Router>
  );
}

// Wrapper to handle the query string logic simply
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
