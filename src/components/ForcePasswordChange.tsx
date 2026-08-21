import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Lock, ShieldAlert } from 'lucide-react';

export default function ForcePasswordChange() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPasswordStatus();
  }, []);

  const checkPasswordStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('force_password_change')
        .eq('id', session.user.id)
        .single();

      if (profile?.force_password_change) {
        setIsOpen(true);
      }
    } catch (err) {
      console.error('Erreur vérification force_password_change:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      // 1. Mettre à jour le mot de passe dans Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // 2. Mettre à jour le profil pour retirer le flag
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ force_password_change: false })
          .eq('id', session.user.id);
          
        if (profileError) throw profileError;
      }

      setIsOpen(false);
      alert("Votre mot de passe a été mis à jour avec succès !");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue lors de la mise à jour.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Sécurisez votre compte</h2>
        <p className="text-slate-500 text-center text-sm mb-8">
          Vous utilisez actuellement un mot de passe temporaire. Pour des raisons de sécurité, veuillez définir votre propre mot de passe avant de continuer.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Nouveau mot de passe</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 transition-all outline-none"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Confirmez le mot de passe</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 transition-all outline-none"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md mt-4"
          >
            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Mettre à jour mon mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}
