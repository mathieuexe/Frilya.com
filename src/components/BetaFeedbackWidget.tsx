import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Send, CheckCircle, X } from 'lucide-react';
import betaIcon from '../assets/lab-flask.png';
import feedbackIcon from '../assets/feedback.png';

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
        <div className="bg-[#f2f4f7] rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] w-[360px] mb-4 overflow-hidden flex flex-col transition-all relative">
          
          {/* Header Bleu Façon Intercom */}
          <div className="bg-[#0057FF] p-6 text-white pb-14 rounded-t-2xl relative">
            <div className="flex justify-between items-start mb-5">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center p-2">
                <img src={betaIcon} alt="Bêta" className="w-full h-full object-contain" />
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-2xl font-bold mb-2">Bonjour, Bêta-testeur 👋</h3>
            <p className="text-sm text-white/90 leading-relaxed">
              Nous sommes ravis de vous compter parmi nous. Vos retours nous aident à améliorer Frilya avant le lancement !
            </p>
          </div>
          
          {/* Card du Formulaire (overlapping) */}
          <div className="px-4 pb-4 -mt-8 relative z-10">
            <div className="bg-white rounded-xl shadow-md p-5 border border-slate-100">
              {success ? (
                <div className="text-center py-6">
                  <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">C'est envoyé !</h4>
                  <p className="text-sm text-slate-500">Merci beaucoup pour votre aide.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Laisser un feedback</h4>
                  
                  <div>
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
                          className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all ${
                            type === t.id 
                              ? 'border-[#0057FF] bg-[#0057FF]/5 text-[#0057FF]' 
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <textarea
                      required
                      rows={3}
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Dites-nous tout..."
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#0057FF] focus:border-[#0057FF] outline-none resize-none bg-slate-50 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !content.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-[#0057FF] hover:bg-blue-700 text-white text-sm font-bold py-3 px-4 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Envoyer
                  </button>
                </form>
              )}
            </div>
            
            <div className="text-center mt-3">
              <span className="text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1">
                Équipe Support Frilya
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bouton Bulle Façon Intercom */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#0057FF] hover:bg-blue-700 text-white rounded-full p-4 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center group"
      >
        {isOpen ? (
          <X className="w-7 h-7 transform group-hover:rotate-90 transition-transform duration-300" />
        ) : (
          <img src={feedbackIcon} alt="Feedback" className="w-7 h-7" />
        )}
      </button>
    </div>
  );
}
