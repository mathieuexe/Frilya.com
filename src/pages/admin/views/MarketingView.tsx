import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, Send, Clock, Eye, AlertTriangle, Users, Store, Globe, CheckCircle } from 'lucide-react';

export default function MarketingView() {
  const [target, setTarget] = useState<'all' | 'buyers' | 'sellers' | 'custom'>('all');
  const [customEmails, setCustomEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const fetchTargetEmails = async () => {
    let query = supabase.from('profiles').select('email').not('email', 'is', null);

    if (target === 'buyers') {
      query = query.eq('role', 'acheteur').eq('is_seller', false);
    } else if (target === 'sellers') {
      query = query.eq('is_seller', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return data.map(p => p.email).filter(Boolean);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!subject.trim() || !htmlContent.trim()) {
        throw new Error('Le sujet et le contenu sont obligatoires.');
      }

      let emails: string[] = [];
      if (target === 'custom') {
        emails = customEmails.split(',').map(e => e.trim()).filter(e => e && e.includes('@'));
        if (emails.length === 0) {
          throw new Error('Veuillez entrer des adresses email valides.');
        }
      } else {
        emails = await fetchTargetEmails();
      }

      if (emails.length === 0) {
        throw new Error('Aucun destinataire trouvé.');
      }

      const payload: any = {
        to: emails,
        subject,
        html: htmlContent
      };

      if (scheduledAt) {
        payload.scheduled_at = new Date(scheduledAt).toISOString();
      }

      // En production, VITE_API_URL n'est souvent pas défini, on utilise un chemin relatif
      const apiUrl = import.meta.env.PROD ? '/api/send-email' : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/send-email`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Erreur lors de l\'envoi');
      }

      setSuccess(true);
      setSubject('');
      setHtmlContent('');
      setScheduledAt('');
      setCustomEmails('');
      
      // Cache le message de succès après quelques secondes
      setTimeout(() => setSuccess(false), 5000);
      
    } catch (err: any) {
      setError(err.message || 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Send className="w-5 h-5 text-frilya-600" />
          Campagne Email (Marketing)
        </h2>
        <p className="text-slate-500 text-sm mt-1">Créez et envoyez des emails promotionnels à vos utilisateurs.</p>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-3 border border-green-100">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">La campagne a été planifiée / envoyée avec succès à la liste cible !</p>
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-6">
          
          {/* Cible */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">Destinataires</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { id: 'all', label: 'Tout le monde', icon: Globe },
                { id: 'buyers', label: 'Acheteurs', icon: Users },
                { id: 'sellers', label: 'Vendeurs', icon: Store },
                { id: 'custom', label: 'Sélection', icon: Eye },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTarget(opt.id as any)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                    target === opt.id 
                      ? 'border-frilya-600 bg-frilya-50 text-frilya-700 shadow-sm' 
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>

            {target === 'custom' && (
              <div className="mt-3">
                <textarea
                  value={customEmails}
                  onChange={(e) => setCustomEmails(e.target.value)}
                  placeholder="jean@exemple.com, marie@exemple.com"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 outline-none min-h-[80px]"
                />
                <p className="text-xs text-slate-500 mt-1">Séparez les adresses email par des virgules.</p>
              </div>
            )}
          </div>

          {/* Sujet */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Sujet de l'email</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 outline-none"
              placeholder="Découvrez nos nouvelles offres..."
            />
          </div>

          {/* Contenu HTML */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-slate-700">Contenu HTML</label>
              <button
                type="button"
                onClick={() => setPreviewMode(!previewMode)}
                className="text-xs font-bold text-frilya-600 hover:text-frilya-700 flex items-center gap-1 bg-frilya-50 px-3 py-1.5 rounded-lg"
              >
                <Eye className="w-3.5 h-3.5" />
                {previewMode ? 'Éditer le code' : 'Aperçu du rendu'}
              </button>
            </div>

            {previewMode ? (
              <div className="w-full p-4 border border-slate-200 rounded-xl min-h-[300px] bg-white overflow-auto shadow-inner">
                {htmlContent ? (
                  <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                ) : (
                  <p className="text-slate-400 text-sm italic text-center mt-10">Aucun contenu à prévisualiser.</p>
                )}
              </div>
            ) : (
              <textarea
                required
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="<h1>Bonjour,</h1><p>Ceci est un email en HTML.</p>"
                className="w-full p-4 bg-slate-900 text-slate-100 border border-slate-800 rounded-xl text-sm font-mono focus:ring-2 focus:ring-frilya-600/50 outline-none min-h-[300px]"
              />
            )}
            <p className="text-xs text-slate-500 mt-2">Vous pouvez utiliser des balises HTML complètes (tables, styles en ligne, images).</p>
          </div>

          {/* Planification */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Date et heure d'envoi (Optionnel)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full sm:w-auto px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">Laissez vide pour un envoi immédiat.</p>
          </div>

          {/* Actions */}
          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-frilya-600 hover:bg-frilya-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {scheduledAt ? 'Planifier la campagne' : 'Envoyer maintenant'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}