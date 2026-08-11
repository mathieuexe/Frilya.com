import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Send, CheckCircle } from 'lucide-react';

export default function BetaFeedback() {
  const [type, setType] = useState('suggestion');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('beta_feedbacks')
        .insert([{
          user_id: session.user.id,
          type: type,
          content: content
        }]);

      if (error) throw error;
      
      setSuccess(true);
      setContent('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error('Erreur feedback:', err);
      alert('Une erreur est survenue lors de l\'envoi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Feedback Bêta</h1>
      <p className="text-slate-600 mb-8">
        Partagez vos retours, signalez des bugs ou proposez des améliorations. Votre avis est essentiel pour nous !
      </p>

      {success ? (
        <div className="bg-green-50 border border-green-200 p-6 rounded-3xl text-center">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-green-900 mb-2">Merci pour votre retour !</h3>
          <p className="text-green-700">Votre feedback a bien été envoyé à l'équipe Frilya.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Type de retour</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: 'suggestion', label: 'Suggestion' },
                { id: 'bug', label: 'Bug' },
                { id: 'review', label: 'Avis' },
                { id: 'other', label: 'Autre' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                    type === t.id 
                      ? 'border-frilya-600 bg-frilya-50 text-frilya-700' 
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Votre message</label>
            <textarea
              required
              rows={6}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Décrivez votre expérience, le problème rencontré ou votre idée d'amélioration..."
              className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-frilya-600 outline-none resize-none bg-slate-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="flex items-center justify-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Envoyer le feedback
          </button>
        </form>
      )}
    </div>
  );
}