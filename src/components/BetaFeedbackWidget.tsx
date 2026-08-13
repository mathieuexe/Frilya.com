import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Send, CheckCircle, MessageSquare, X } from 'lucide-react';

export default function BetaFeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState('suggestion');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    checkVisibility();
  }, []);

  const checkVisibility = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_beta, role')
        .eq('id', session.user.id)
        .single();

      if (profile?.is_beta || profile?.role === 'beta' || profile?.role === 'admin') {
        setIsVisible(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

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
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
      }, 3000);
    } catch (err) {
      console.error('Erreur feedback:', err);
      alert('Une erreur est survenue lors de l\'envoi.');
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[340px] mb-4 overflow-hidden flex flex-col transition-all">
          <div className="bg-frilya-900 p-4 text-white flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Feedback Bêta
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4">
            {success ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 mb-1">Merci !</h4>
                <p className="text-sm text-slate-500">Votre retour a bien été envoyé.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Type de retour</label>
                  <div className="grid grid-cols-2 gap-2">
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
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
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
                  <label className="block text-xs font-bold text-slate-700 mb-2">Votre message</label>
                  <textarea
                    required
                    rows={4}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Décrivez votre idée ou le problème rencontré..."
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-frilya-600 outline-none resize-none bg-slate-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !content.trim()}
                  className="flex items-center justify-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Envoyer
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-frilya-900 hover:bg-frilya-800 text-white rounded-full p-4 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </div>
  );
}
