import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import equipeImg from '../../assets/equipe.png';

export default function Onboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth?redirect=/vendeur/onboarding');
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (data?.is_seller) {
      navigate('/dashboard/vendeur');
      return;
    }

    setProfile(data);
    setLoading(false);
  };

  const handleBecomeSeller = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_seller: true })
        .eq('id', profile.id);

      if (error) throw error;
      
      navigate('/dashboard/vendeur');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil', error);
      alert('Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-frilya-600" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-100 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-lg border-4 border-frilya-50">
            <img src={equipeImg} alt="Équipe Frilya" className="w-full h-auto object-cover" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Devenez vendeur sur Frilya</h1>
        <p className="text-lg text-slate-600 mb-8">
          Rejoignez la première plateforme dédiée aux talents français. Proposez vos services, définissez vos tarifs et commencez à travailler avec des clients de confiance.
        </p>

        <div className="text-left bg-slate-50 p-6 rounded-2xl mb-8 space-y-4">
          <h3 className="font-bold text-slate-900">Ce qui vous attend :</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              <span className="text-slate-700">Création d'annonces (services) simplifiée</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              <span className="text-slate-700">Paiements sécurisés garantis par Stripe Connect</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              <span className="text-slate-700">Gestion centralisée de vos commandes et clients</span>
            </li>
          </ul>
        </div>

        <button
          onClick={handleBecomeSeller}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md disabled:opacity-70"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Activer mon espace vendeur'}
          {!saving && <ArrowRight className="w-5 h-5" />}
        </button>
        <p className="text-xs text-slate-400 mt-4">
          En activant votre espace vendeur, vous acceptez nos Conditions Générales de Vente.
        </p>
      </div>
    </div>
  );
}