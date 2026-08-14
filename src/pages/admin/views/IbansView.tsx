import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

export default function IbansView() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchIbans();
  }, []);

  const fetchIbans = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('rib_status', 'pending')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async (profileId: string, status: 'approved' | 'rejected', email: string, name: string) => {
    setActionLoading(profileId);
    try {
      // 1. Update status
      const { error } = await supabase
        .from('profiles')
        .update({ rib_status: status })
        .eq('id', profileId);
        
      if (error) throw error;

      // 2. Send private message via Support
      const messageContent = status === 'approved' 
        ? `Bonjour ${name},\n\nNous vous informons que vos coordonnées bancaires (IBAN/RIB) ont été validées avec succès par notre équipe.\n\nCordialement,\nL'équipe Support Frilya.`
        : `Bonjour ${name},\n\nNous vous informons que vos coordonnées bancaires (IBAN/RIB) n'ont pas pu être validées.\nMerci de bien vouloir vérifier les informations saisies et de soumettre un nouveau document si nécessaire.\n\nCordialement,\nL'équipe Support Frilya.`;

      await supabase.rpc('send_support_message', {
        p_receiver_id: profileId,
        p_content: messageContent
      });

      // 3. Send email (via Resend)
      try {
        const response = await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: [email],
            subject: status === 'approved' ? 'Vos coordonnées bancaires sont validées' : 'Vos coordonnées bancaires ont été refusées',
            html: `<p>${messageContent.replace(/\n/g, '<br/>')}</p>`
          })
        });
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("text/html") !== -1) {
          console.error("L'API d'email n'est pas disponible en local sans Vercel CLI.");
        } else if (!response.ok) {
          const errData = await response.json().catch(() => null);
          console.error("Erreur API email IBAN:", errData);
        }
      } catch (emailErr) {
        console.error("Erreur envoi email:", emailErr);
        // On ne bloque pas si l'email échoue
      }

      // Refresh
      fetchIbans();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la mise à jour.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold text-slate-900">Vérification des IBAN</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold">Utilisateur</th>
              <th className="p-4 font-semibold">Bénéficiaire</th>
              <th className="p-4 font-semibold">IBAN / BIC</th>
              <th className="p-4 font-semibold">Banque</th>
              <th className="p-4 font-semibold">Document (RIB)</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-frilya-600" />
                </td>
              </tr>
            ) : profiles.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Aucun IBAN en attente de vérification.
                </td>
              </tr>
            ) : (
              profiles.map(profile => (
                <tr key={profile.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-sm">
                            {profile.full_name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{profile.full_name}</div>
                        <div className="text-xs text-slate-500">{profile.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-medium text-slate-700">{profile.beneficiary_name || '-'}</span>
                  </td>
                  <td className="p-4">
                    <div className="font-mono text-sm text-slate-900">{profile.iban}</div>
                    <div className="text-xs text-slate-500">BIC: {profile.bic || '-'}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-medium text-slate-700">{profile.bank_name || '-'}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[150px]" title={profile.bank_address}>
                      {profile.bank_address || '-'}
                    </div>
                  </td>
                  <td className="p-4">
                    {profile.rib_file_url ? (
                      <a 
                        href={profile.rib_file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-frilya-600 hover:text-frilya-700 font-medium"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Voir le RIB
                      </a>
                    ) : (
                      <span className="text-sm text-slate-400 italic">Aucun fichier</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleValidation(profile.id, 'approved', profile.email, profile.full_name)}
                        disabled={actionLoading === profile.id}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Accepter"
                      >
                        {actionLoading === profile.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleValidation(profile.id, 'rejected', profile.email, profile.full_name)}
                        disabled={actionLoading === profile.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Refuser"
                      >
                        {actionLoading === profile.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}