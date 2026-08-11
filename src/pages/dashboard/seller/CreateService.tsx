import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { Save, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CreateService() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price_basic: '',
    delivery_time_days: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non authentifié");

      const { error } = await supabase
        .from('services')
        .insert({
          seller_id: session.user.id,
          title: formData.title,
          description: formData.description,
          price_basic: Number(formData.price_basic),
          delivery_time_days: Number(formData.delivery_time_days),
          status: 'active'
        });

      if (error) throw error;

      navigate('/dashboard/vendeur/services');
    } catch (error) {
      console.error("Erreur lors de la création :", error);
      alert("Erreur lors de la création de l'annonce");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/dashboard/vendeur/services" className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Créer une nouvelle annonce</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Titre de votre service</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            placeholder="Je vais créer votre logo professionnel"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 outline-none"
          />
          <p className="text-xs text-slate-500 mt-1">Soyez précis, c'est ce que vos clients verront en premier.</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Description détaillée</label>
          <textarea
            required
            rows={5}
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Décrivez précisément ce que vous incluez dans votre service..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Prix de base (€)</label>
            <div className="relative">
              <input
                type="number"
                required
                min="5"
                step="5"
                value={formData.price_basic}
                onChange={(e) => setFormData({...formData, price_basic: e.target.value})}
                placeholder="5"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Le prix minimum est de 5€.</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Délai de livraison (Jours)</label>
            <div className="relative">
              <input
                type="number"
                required
                min="1"
                value={formData.delivery_time_days}
                onChange={(e) => setFormData({...formData, delivery_time_days: e.target.value})}
                placeholder="3"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-16 text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Jours</span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-frilya-600 hover:bg-frilya-500 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Publier mon annonce
          </button>
        </div>
      </form>
    </div>
  );
}