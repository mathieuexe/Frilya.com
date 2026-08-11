import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { sendBetaConfirmationEmail } from '../lib/email';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import logo from '../assets/logo.png';

export default function BetaRegistration() {
  const [formData, setFormData] = useState({
    pseudo: '',
    email: '',
    motivation: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBetaActive, setIsBetaActive] = useState<boolean | null>(null);

  useEffect(() => {
    const checkBetaStatus = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'beta_mode_active')
          .single();
        setIsBetaActive(data?.value === 'true' || data?.value === true);
      } catch (err) {
        setIsBetaActive(false); // Par défaut on désactive si erreur ou non trouvé
      }
    };
    checkBetaStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Sauvegarder en base de données
      const { error: dbError } = await supabase
        .from('beta_applications')
        .insert([{
          pseudo: formData.pseudo,
          email: formData.email,
          motivation: formData.motivation
        }]);

      if (dbError) throw dbError;

      // 2. Envoyer l'email de confirmation via Resend
      await sendBetaConfirmationEmail(formData.email, formData.pseudo);

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError("Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Demande envoyée !</h1>
          <p className="text-slate-600 mb-6">
            Merci pour votre intérêt ! Nous avons bien reçu votre candidature pour participer à la Bêta de Frilya.
          </p>
          <p className="text-sm text-slate-500 mb-8 p-4 bg-slate-50 rounded-xl">
            Un e-mail de confirmation vient de vous être envoyé. Si votre demande est acceptée, vos identifiants de connexion seront envoyés à cette même adresse.
          </p>
          <a href="/" className="inline-block bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3 px-8 rounded-xl transition-colors">
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-12">
      <div className="mb-8">
        <a href="/">
          <img src={logo} alt="Frilya" className="h-10 w-auto mx-auto" />
        </a>
      </div>

      {isBetaActive === null ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-frilya-600" /></div>
      ) : !isBetaActive ? (
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-slate-100 max-w-xl w-full text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Programme Bêta fermé</h1>
          <p className="text-slate-600 mb-6">
            Les inscriptions à notre programme Bêta sont actuellement fermées. Merci pour votre intérêt et restez à l'écoute pour le lancement officiel !
          </p>
          <a href="/" className="inline-block bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3 px-8 rounded-xl transition-colors">
            Retour à l'accueil
          </a>
        </div>
      ) : (
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-slate-100 max-w-xl w-full">
          <div className="text-center mb-8">
          <span className="inline-block px-3 py-1 bg-frilya-100 text-frilya-700 font-bold text-xs rounded-full uppercase tracking-wider mb-4">Programme Bêta</span>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Rejoignez la Bêta</h1>
          <p className="text-slate-600">
            Aidez-nous à construire la meilleure plateforme pour les freelances. Testez le site en avant-première et partagez vos retours.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Pseudo</label>
            <input
              type="text"
              required
              value={formData.pseudo}
              onChange={(e) => setFormData({...formData, pseudo: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-frilya-600 transition-shadow bg-slate-50"
              placeholder="Votre pseudo sur la plateforme"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Adresse e-mail</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-frilya-600 transition-shadow bg-slate-50"
              placeholder="nom@exemple.com"
            />
            <p className="text-xs text-amber-600 mt-2 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Cette adresse doit être valide pour recevoir vos accès.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Pourquoi souhaitez-vous rejoindre la Bêta ?</label>
            <textarea
              required
              rows={4}
              value={formData.motivation}
              onChange={(e) => setFormData({...formData, motivation: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-frilya-600 transition-shadow bg-slate-50 resize-none"
              placeholder="Expliquez-nous brièvement vos motivations..."
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Envoyer ma candidature'
              )}
            </button>
          </div>
          
          <p className="text-center text-xs text-slate-400 mt-4">
            En soumettant ce formulaire, vous acceptez d'être contacté(e) par e-mail concernant le programme Bêta.
          </p>
        </form>
      </div>
      )}
    </div>
  );
}