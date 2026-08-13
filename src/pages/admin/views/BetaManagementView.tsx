import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { sendBetaAcceptedEmail, sendBetaRejectedEmail } from '../../../lib/email';
import { Loader2, Check, X, ShieldAlert, Trash2, MessageSquare, ExternalLink } from 'lucide-react';

export default function BetaManagementView() {
  const [activeTab, setActiveTab] = useState<'requests' | 'testers' | 'feedbacks' | 'settings'>('requests');
  
  // Data states
  const [requests, setRequests] = useState<any[]>([]);
  const [testers, setTesters] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Action states
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  const [feedbackRejectModalOpen, setFeedbackRejectModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [feedbackRejectReason, setFeedbackRejectReason] = useState('');

  const [betaEndDate, setBetaEndDate] = useState<string>('');
  const [isBetaActiveGlobal, setIsBetaActiveGlobal] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [ipWhitelist, setIpWhitelist] = useState<string[]>([]);
  const [newIp, setNewIp] = useState('');
  const [ipLoading, setIpLoading] = useState(false);

  useEffect(() => {
    fetchData();
    fetchBetaGlobalStatus();
    // Default beta end date (e.g., +30 days)
    const date = new Date();
    date.setDate(date.getDate() + 30);
    setBetaEndDate(date.toISOString().split('T')[0]);
  }, [activeTab]);

  const fetchBetaGlobalStatus = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['beta_mode_active', 'beta_ip_whitelist']);
        
      if (data) {
        data.forEach(s => {
          if (s.key === 'beta_mode_active') setIsBetaActiveGlobal(s.value === 'true' || s.value === true);
          if (s.key === 'beta_ip_whitelist') setIpWhitelist(Array.isArray(s.value) ? s.value : []);
        });
      }
    } catch (err) {
      console.error('Erreur lecture statut global beta:', err);
    }
  };

  const handleToggleGlobalBeta = async () => {
    setToggleLoading(true);
    try {
      const newValue = !isBetaActiveGlobal;
      
      // On check si la clé existe déjà
      const { data: existingKey } = await supabase
        .from('settings')
        .select('key')
        .eq('key', 'beta_mode_active')
        .single();

      if (existingKey) {
        await supabase
          .from('settings')
          .update({ value: newValue.toString() })
          .eq('key', 'beta_mode_active');
      } else {
        await supabase
          .from('settings')
          .insert([{ key: 'beta_mode_active', value: newValue.toString() }]);
      }
      
      setIsBetaActiveGlobal(newValue);
    } catch (err) {
      console.error(err);
      alert("Erreur lors du changement du statut.");
    } finally {
      setToggleLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'requests') {
        const { data } = await supabase.from('beta_applications').select('*').order('created_at', { ascending: false });
        setRequests(data || []);
      } else if (activeTab === 'testers') {
        const { data: testersData } = await supabase.from('profiles').select('*').eq('is_beta', true).order('created_at', { ascending: false });
        setTesters(testersData || []);
        
        const { data: usersData } = await supabase.from('profiles').select('id, full_name, email, role, is_beta').order('full_name', { ascending: true });
        setAllUsers(usersData || []);
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

      let userId = authData.user?.id;

      if (authError) {
        if (authError.message.includes('already registered') || authError.status === 400) {
          // User already exists, fetch their ID
          const { data: existingUser } = await supabase.from('profiles').select('id').eq('email', request.email).single();
          if (existingUser) {
            userId = existingUser.id;
          } else {
             throw authError;
          }
        } else {
          throw authError;
        }
      }

      // 3. Update profile to be beta (Trigger should have created the profile)
      // We might need to wait a second for the trigger if just created
      if (!authError) {
        await new Promise(r => setTimeout(r, 1000));
      }
      
      if (userId) {
        await supabase.from('profiles').update({
          is_beta: true,
          beta_end_date: new Date(betaEndDate).toISOString(),
          // Don't overwrite role if they are already seller/buyer, just set is_beta to true
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

  const handleApproveFeedback = async (feedback: any) => {
    setActionLoading(feedback.id);
    try {
      const responseMsg = "Merci pour votre retour ! Nous l'avons bien pris en compte et il a été approuvé.";
      
      await supabase.from('beta_feedbacks').update({
        status: 'approved',
        admin_response: responseMsg
      }).eq('id', feedback.id);

      // Envoi du message système
      const adminId = 'f7763c3f-28a7-4f0a-bdce-8e43ed9d9beb';
      await supabase.rpc('send_system_message', {
        p_sender_id: adminId,
        p_receiver_id: feedback.user_id,
        p_content: responseMsg
      });

      alert("Feedback approuvé et utilisateur notifié !");
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'approbation du feedback.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectFeedback = async () => {
    if (!selectedFeedback) return;
    setActionLoading(selectedFeedback.id);
    try {
      await supabase.from('beta_feedbacks').update({
        status: 'rejected',
        rejection_reason: feedbackRejectReason
      }).eq('id', selectedFeedback.id);

      // Envoi du message système
      const adminId = 'f7763c3f-28a7-4f0a-bdce-8e43ed9d9beb';
      const msg = `Merci pour votre retour ! Cependant, nous n'avons pas pu l'approuver pour la raison suivante :\n\n${feedbackRejectReason}`;
      
      await supabase.rpc('send_system_message', {
        p_sender_id: adminId,
        p_receiver_id: selectedFeedback.user_id,
        p_content: msg
      });

      alert("Feedback rejeté et utilisateur notifié !");
      setFeedbackRejectModalOpen(false);
      setFeedbackRejectReason('');
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Erreur lors du rejet du feedback.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBetaStatus = async (userId: string, isCurrentlyBeta: boolean) => {
    try {
      setActionLoading(userId);
      if (isCurrentlyBeta) {
        // Remove beta status but keep the user role as is (acheteur/vendeur)
        // Only if their role was explicitly 'beta', change it back to 'acheteur' as fallback
        const user = allUsers.find(u => u.id === userId);
        const newRole = user?.role === 'beta' ? 'acheteur' : user?.role;
        
        await supabase.from('profiles').update({
          is_beta: false,
          beta_end_date: null,
          role: newRole
        }).eq('id', userId);
        alert("Accès Bêta retiré avec succès. Le compte reste actif.");
      } else {
        // Grant beta status
        const defaultEndDate = new Date();
        defaultEndDate.setMonth(defaultEndDate.getMonth() + 1); // +1 month by default
        
        await supabase.from('profiles').update({
          is_beta: true,
          beta_end_date: defaultEndDate.toISOString()
        }).eq('id', userId);
        alert("Accès Bêta accordé avec succès !");
      }
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la modification de l'accès Bêta.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddIp = async () => {
    if (!newIp.trim()) return;
    setIpLoading(true);
    try {
      const updatedList = [...ipWhitelist, newIp.trim()];
      
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'beta_ip_whitelist', value: updatedList }, { onConflict: 'key' });
        
      if (error) throw error;
      setIpWhitelist(updatedList);
      setNewIp('');
    } catch (err) {
      console.error('Error adding IP:', err);
      alert("Erreur lors de l'ajout de l'IP");
    } finally {
      setIpLoading(false);
    }
  };

  const handleRemoveIp = async (ipToRemove: string) => {
    setIpLoading(true);
    try {
      const updatedList = ipWhitelist.filter(ip => ip !== ipToRemove);
      
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'beta_ip_whitelist', value: updatedList }, { onConflict: 'key' });
        
      if (error) throw error;
      setIpWhitelist(updatedList);
    } catch (err) {
      console.error('Error removing IP:', err);
      alert("Erreur lors de la suppression de l'IP");
    } finally {
      setIpLoading(false);
    }
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
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' : req.status === 'accepted' || req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {req.status === 'accepted' ? 'approuvé' : req.status}
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
            <div className="space-y-8">
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
                          <button 
                            onClick={() => handleToggleBetaStatus(tester.id, true)}
                            disabled={actionLoading === tester.id}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium flex items-center gap-1 ml-auto" 
                            title="Retirer l'accès Bêta"
                          >
                            {actionLoading === tester.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                            Retirer l'accès
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* All Users section to add to Beta */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-900">Ajouter un compte existant à la Bêta</h2>
                  <p className="text-sm text-slate-500 mt-1">Vous pouvez accorder l'accès bêta à des acheteurs ou vendeurs existants.</p>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider sticky top-0 shadow-sm">
                        <th className="p-4 font-semibold">Utilisateur</th>
                        <th className="p-4 font-semibold">Rôle</th>
                        <th className="p-4 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allUsers.filter(u => !u.is_beta).map(user => (
                        <tr key={user.id} className="hover:bg-slate-50">
                          <td className="p-4">
                            <div className="font-bold text-slate-900">{user.full_name}</div>
                            <div className="text-sm text-slate-500">{user.email}</div>
                          </td>
                          <td className="p-4"><span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full capitalize">{user.role}</span></td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => handleToggleBetaStatus(user.id, false)}
                              disabled={actionLoading === user.id}
                              className="px-3 py-1.5 bg-frilya-900 hover:bg-frilya-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ml-auto"
                            >
                              {actionLoading === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              Accorder Accès Bêta
                            </button>
                          </td>
                        </tr>
                      ))}
                      {allUsers.filter(u => !u.is_beta).length === 0 && (
                        <tr><td colSpan={3} className="p-8 text-center text-slate-500">Tous les utilisateurs sont déjà dans la Bêta.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: FEEDBACKS */}
          {activeTab === 'feedbacks' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {feedbacks.length === 0 ? (
                <div className="col-span-full p-8 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">Aucun feedback reçu.</div>
              ) : feedbacks.map(fb => (
                <div key={fb.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative">
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      fb.status === 'approved' ? 'bg-green-100 text-green-700' :
                      fb.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {fb.status || 'pending'}
                    </span>
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
                  <p className="text-sm text-slate-700 whitespace-pre-wrap mb-4">{fb.content}</p>
                  
                  {(!fb.status || fb.status === 'pending') && (
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                      <button onClick={() => { setSelectedFeedback(fb); setFeedbackRejectModalOpen(true); }} className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1">
                        <X className="w-3 h-3" /> Rejeter
                      </button>
                      <button onClick={() => handleApproveFeedback(fb)} disabled={actionLoading === fb.id} className="px-3 py-1.5 text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-1">
                        {actionLoading === fb.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Approuver
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 max-w-2xl space-y-8">
              
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-6">État du mode Bêta</h2>
                <div className="flex items-center justify-between p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Activer le programme Bêta</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Si désactivé, plus aucune nouvelle demande ne pourra être soumise depuis la page /beta.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleGlobalBeta}
                    disabled={toggleLoading}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-frilya-600 focus:ring-offset-2 ${
                      isBetaActiveGlobal ? 'bg-frilya-900' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        isBetaActiveGlobal ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-6">Liste Blanche IP (Whitelist)</h2>
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-sm text-slate-600 mb-4">
                    Les adresses IP ajoutées ici pourront soumettre plusieurs demandes de Bêta sans être bloquées par la limite d'une demande par IP.
                  </p>
                  
                  <div className="flex gap-2 mb-6">
                    <input
                      type="text"
                      value={newIp}
                      onChange={e => setNewIp(e.target.value)}
                      placeholder="Ex: 192.168.1.1"
                      className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600"
                    />
                    <button
                      onClick={handleAddIp}
                      disabled={ipLoading || !newIp.trim()}
                      className="px-4 py-2 bg-frilya-900 hover:bg-frilya-800 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {ipLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Ajouter
                    </button>
                  </div>

                  <div className="space-y-2">
                    {ipWhitelist.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">Aucune adresse IP sur liste blanche.</p>
                    ) : (
                      ipWhitelist.map((ip, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-3 border border-slate-200 rounded-lg">
                          <span className="font-mono text-sm text-slate-700">{ip}</span>
                          <button
                            onClick={() => handleRemoveIp(ip)}
                            disabled={ipLoading}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-6">Prévisualisation</h2>
                <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-blue-900 text-lg">Tester le mode Bêta</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Visualisez la page d'accueil de la bêta exactement comme la verraient les utilisateurs.
                    </p>
                  </div>
                  <a 
                    href="/beta?preview=true" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm flex items-center gap-2 transition-colors shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ouvrir la prévisualisation
                  </a>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-6 text-red-600">Zone de danger</h2>
                
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
      {/* Reject Modal (Feedback) */}
      {feedbackRejectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Rejeter le feedback</h3>
            <p className="text-sm text-slate-600 mb-4">Indiquez le motif du rejet (sera visible par l'utilisateur) :</p>
            <textarea
              value={feedbackRejectReason}
              onChange={e => setFeedbackRejectReason(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-frilya-600 outline-none resize-none h-24 mb-4"
              placeholder="Ex: Nous avons déjà connaissance de ce bug, merci..."
            ></textarea>
            <div className="flex justify-end gap-3">
              <button onClick={() => setFeedbackRejectModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Annuler</button>
              <button onClick={handleRejectFeedback} disabled={actionLoading === selectedFeedback?.id} className="px-4 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center gap-2">
                {actionLoading === selectedFeedback?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}