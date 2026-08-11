import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { sendBetaAcceptedEmail, sendBetaRejectedEmail } from '../../../lib/email';
import { Loader2, Check, X, RefreshCw, MessageSquare, Trash2, ShieldAlert } from 'lucide-react';

export default function BetaManagementView() {
  const [activeTab, setActiveTab] = useState<'requests' | 'testers' | 'feedbacks' | 'settings'>('requests');
  
  // Data states
  const [requests, setRequests] = useState<any[]>([]);
  const [testers, setTesters] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Action states
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [betaEndDate, setBetaEndDate] = useState<string>('');

  useEffect(() => {
    fetchData();
    // Default beta end date (e.g., +30 days)
    const date = new Date();
    date.setDate(date.getDate() + 30);
    setBetaEndDate(date.toISOString().split('T')[0]);
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'requests') {
        const { data } = await supabase.from('beta_applications').select('*').order('created_at', { ascending: false });
        setRequests(data || []);
      } else if (activeTab === 'testers') {
        const { data } = await supabase.from('profiles').select('*').eq('is_beta', true).order('created_at', { ascending: false });
        setTesters(data || []);
      } else if (activeTab === 'feedbacks') {
        const { data } = await supabase.from('beta_feedbacks').select('*, user:profiles(full_name, email)').order('created_at', { ascending: false });
        setFeedbacks(data || []);
      }
    } catch (err) {
      console.error('Error fetching beta data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (request: any) => {
    setActionLoading(request.id);
    try {
      // 1. Generate random password
      const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
      
      // 2. Create user auth account
      // Note: We need a backend to bypass email confirmation or sign up directly.
      // Since we don't have one, we'll try to sign up and maybe the email will be sent.
      // Alternatively, we use Supabase Admin API, but since we are client-side...
      // Actually, standard `signUp` will create the user.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: request.email,
        password: tempPassword,
        options: {
          data: {
            full_name: request.pseudo,
          }
        }
      });

      if (authError) throw authError;

      // 3. Update profile to be beta (Trigger should have created the profile)
      // We might need to wait a second for the trigger
      await new Promise(r => setTimeout(r, 1000));
      
      const userId = authData.user?.id;
      if (userId) {
        await supabase.from('profiles').update({
          is_beta: true,
          beta_end_date: new Date(betaEndDate).toISOString(),
          full_name: request.pseudo
        }).eq('id', userId);
      }

      // 4. Update request status
      await supabase.from('beta_applications').update({ status: 'accepted' }).eq('id', request.id);

      // 5. Send Email
      await sendBetaAcceptedEmail(request.email, request.pseudo, tempPassword, betaEndDate);

      alert("Candidature acceptée et email envoyé !");
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert("Erreur: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    setActionLoading(selectedRequest.id);
    try {
      await supabase.from('beta_applications').update({ 
        status: 'rejected', 
        rejection_reason: rejectReason 
      }).eq('id', selectedRequest.id);

      await sendBetaRejectedEmail(selectedRequest.email, selectedRequest.pseudo, rejectReason);

      alert("Candidature refusée et email envoyé !");
      setRejectModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert("Erreur: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteBetaUsers = async () => {
    if (!window.confirm("Êtes-vous SÛR de vouloir supprimer tous les comptes Bêta ? Cette action est irréversible.")) return;
    
    // In a real app, this should be done via a secure Edge Function since deleting auth users from client is restricted.
    alert("Note: La suppression des comptes 'auth' doit être faite depuis le panel Supabase ou une Edge Function (Admin API). Vous pouvez néanmoins désactiver le mode Bêta.");
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'requests' ? 'bg-frilya-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Demandes</button>
        <button onClick={() => setActiveTab('testers')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'testers' ? 'bg-frilya-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Testeurs Bêta</button>
        <button onClick={() => setActiveTab('feedbacks')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'feedbacks' ? 'bg-frilya-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Feedbacks</button>
        <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'settings' ? 'bg-frilya-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Paramètres Bêta</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-frilya-600" /></div>
      ) : (
        <>
          {/* TAB: REQUESTS */}
          {activeTab === 'requests' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">Demandes d'accès à la Bêta</h2>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600 font-medium">Date de fin Bêta (pour acceptation) :</label>
                  <input type="date" value={betaEndDate} onChange={e => setBetaEndDate(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm" />
                </div>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Candidat</th>
                    <th className="p-4 font-semibold">Motivation</th>
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Statut</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">Aucune demande.</td></tr>
                  ) : requests.map(req => (
                    <tr key={req.id}>
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{req.pseudo}</div>
                        <div className="text-sm text-slate-500">{req.email}</div>
                      </td>
                      <td className="p-4 text-sm text-slate-600 max-w-xs truncate" title={req.motivation}>{req.motivation}</td>
                      <td className="p-4 text-sm text-slate-500">{new Date(req.created_at).toLocaleDateString('fr-FR')}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' : req.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {req.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => { setSelectedRequest(req); setRejectModalOpen(true); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Refuser">
                              <X className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleAcceptRequest(req)} disabled={actionLoading === req.id} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Accepter">
                              {actionLoading === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: TESTERS */}
          {activeTab === 'testers' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100"><h2 className="text-xl font-bold text-slate-900">Comptes Bêta Actifs</h2></div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Testeur</th>
                    <th className="p-4 font-semibold">Rôle actuel</th>
                    <th className="p-4 font-semibold">Date de fin</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {testers.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">Aucun testeur.</td></tr>
                  ) : testers.map(tester => (
                    <tr key={tester.id}>
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{tester.full_name}</div>
                        <div className="text-sm text-slate-500">{tester.email}</div>
                      </td>
                      <td className="p-4"><span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">{tester.role}</span></td>
                      <td className="p-4 text-sm text-slate-600">{tester.beta_end_date ? new Date(tester.beta_end_date).toLocaleDateString('fr-FR') : '-'}</td>
                      <td className="p-4 text-right">
                        <button className="p-2 text-slate-400 hover:text-frilya-600 hover:bg-frilya-50 rounded-lg transition-colors" title="Renvoyer les accès">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: FEEDBACKS */}
          {activeTab === 'feedbacks' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {feedbacks.length === 0 ? (
                <div className="col-span-full p-8 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">Aucun feedback reçu.</div>
              ) : feedbacks.map(fb => (
                <div key={fb.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative">
                  <div className="absolute top-4 right-4">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${fb.type === 'bug' ? 'bg-red-100 text-red-700' : fb.type === 'suggestion' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                      {fb.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{fb.user?.full_name || 'Anonyme'}</h3>
                      <p className="text-xs text-slate-500">{new Date(fb.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{fb.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 max-w-2xl">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Zone de danger</h2>
              
              <div className="p-6 bg-red-50 border border-red-200 rounded-2xl">
                <div className="flex items-start gap-4 mb-4">
                  <ShieldAlert className="w-8 h-8 text-red-600 shrink-0" />
                  <div>
                    <h3 className="font-bold text-red-900 text-lg">Fin de la Bêta</h3>
                    <p className="text-sm text-red-700 mt-1">
                      Si vous désactivez le mode bêta pour lancer la plateforme publiquement, vous pouvez supprimer tous les comptes créés dans le cadre de la bêta. (Action irréversible)
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleDeleteBetaUsers}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer tous les comptes Bêta
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Refuser la candidature</h3>
            <p className="text-sm text-slate-600 mb-4">Indiquez le motif du refus pour {selectedRequest?.pseudo} :</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-frilya-600 outline-none resize-none h-24 mb-4"
              placeholder="Ex: Nous avons déjà atteint notre quota de testeurs..."
            ></textarea>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRejectModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Annuler</button>
              <button onClick={handleRejectRequest} disabled={actionLoading === selectedRequest?.id} className="px-4 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center gap-2">
                {actionLoading === selectedRequest?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}