import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, CheckCircle, XCircle, Search, Clock, CreditCard } from 'lucide-react';
import { SUPPORT_ACCOUNT_ID } from '../../../lib/constants';

export default function WithdrawalsView() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  // Form states
  const [status, setStatus] = useState<'accepted' | 'rejected'>('accepted');
  const [platform, setPlatform] = useState('Stripe');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [rib, setRib] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*, seller:profiles!withdrawal_requests_seller_id_fkey(full_name, email, iban)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des demandes:', err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (req: any) => {
    setSelectedRequest(req);
    setStatus('accepted');
    setPlatform('Stripe');
    setReference('');
    setNote('');
    setRib(req.rib_iban || req.seller?.iban || '');
  };

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setProcessing(true);
    try {
      const { error } = await supabase.rpc('process_withdrawal', {
        p_req_id: selectedRequest.id,
        p_status: status,
        p_platform: platform,
        p_reference: reference,
        p_note: note,
        p_rib: rib
      });

      if (error) throw error;

      if (status === 'accepted') {
        const msg = `Bonjour,\n\nVotre demande de retrait d'un montant de ${Number(selectedRequest.amount).toFixed(2)} € a été acceptée et traitée avec succès !\n\nPlateforme utilisée : ${platform}\nIBAN cible : ${rib}\nRéférence du virement : ${reference}\n${note ? `\nNote de l'administrateur : ${note}` : ''}\n\nLe montant devrait apparaître sur votre compte bancaire d'ici quelques jours ouvrés selon les délais bancaires habituels.\n\nL'équipe Frilya`;
        
        await supabase.from('messages').insert({
          sender_id: SUPPORT_ACCOUNT_ID,
          receiver_id: selectedRequest.seller_id,
          content: msg
        });
      } else if (status === 'rejected') {
        const msg = `Bonjour,\n\nVotre demande de retrait d'un montant de ${Number(selectedRequest.amount).toFixed(2)} € a malheureusement été refusée.\n\nMotif : ${note}\n\nLe montant a été recrédité sur votre solde Frilya. Si vous avez des questions, n'hésitez pas à répondre à ce message.\n\nL'équipe Frilya`;
        
        await supabase.from('messages').insert({
          sender_id: SUPPORT_ACCOUNT_ID,
          receiver_id: selectedRequest.seller_id,
          content: msg
        });
      }

      await fetchRequests();
      setSelectedRequest(null);
    } catch (err) {
      console.error('Erreur traitement:', err);
      alert("Erreur lors du traitement de la demande");
    } finally {
      setProcessing(false);
    }
  };

  const filtered = requests.filter(r => 
    r.seller?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.seller?.email?.toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-frilya-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Demandes de retrait</h2>
          <p className="text-slate-500 text-sm">Gérez les demandes de virement des vendeurs</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher (nom, email...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-frilya-600 focus:ring-2 focus:ring-frilya-600/10"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-bold">Vendeur</th>
                <th className="px-6 py-4 font-bold">Montant</th>
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold">Statut</th>
                <th className="px-6 py-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Aucune demande trouvée
                  </td>
                </tr>
              ) : filtered.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{req.seller?.full_name || 'Utilisateur inconnu'}</div>
                    <div className="text-xs text-slate-500">{req.seller?.email}</div>
                  </td>
                  <td className="px-6 py-4 font-black text-slate-900">
                    {Number(req.amount).toFixed(2)} €
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {new Date(req.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      req.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {req.status === 'pending' ? <Clock className="w-3 h-3" /> : req.status === 'accepted' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {req.status === 'pending' ? 'En attente' : req.status === 'accepted' ? 'Accepté' : 'Refusé'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openModal(req)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                    >
                      {req.status === 'pending' ? 'Traiter' : 'Détails'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de traitement */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">
                {selectedRequest.status === 'pending' ? 'Traiter la demande' : 'Détails du retrait'}
              </h3>
            </div>
            
            <form onSubmit={handleProcess} className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-sm text-slate-500 mb-1">Montant demandé</div>
                <div className="text-2xl font-black text-slate-900">{Number(selectedRequest.amount).toFixed(2)} €</div>
                <div className="text-sm font-medium text-slate-700 mt-2">Par : {selectedRequest.seller?.full_name}</div>
              </div>

              {selectedRequest.status === 'pending' ? (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Décision</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setStatus('accepted')}
                        className={`py-2 px-4 rounded-xl border-2 font-bold text-sm transition-all ${status === 'accepted' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}
                      >
                        Accepter
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus('rejected')}
                        className={`py-2 px-4 rounded-xl border-2 font-bold text-sm transition-all ${status === 'rejected' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500'}`}
                      >
                        Refuser
                      </button>
                    </div>
                  </div>

                  {status === 'accepted' && (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Plateforme de paiement</label>
                        <input
                          type="text"
                          value={platform}
                          onChange={(e) => setPlatform(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-frilya-600 focus:ring-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">RIB / IBAN cible</label>
                        <input
                          type="text"
                          value={rib}
                          onChange={(e) => setRib(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-frilya-600 focus:ring-2 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Référence du virement</label>
                        <input
                          type="text"
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                          placeholder="Ex: STRIPE-12345"
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-frilya-600 focus:ring-2"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Note (visible par le vendeur)</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={status === 'rejected' ? "Motif du refus..." : "Note optionnelle..."}
                      required={status === 'rejected'}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-frilya-600 focus:ring-2"
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Date de la demande</div>
                      <div className="font-bold text-slate-900">{new Date(selectedRequest.created_at).toLocaleString('fr-FR')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Date de traitement</div>
                      <div className="font-bold text-slate-900">{selectedRequest.processed_at ? new Date(selectedRequest.processed_at).toLocaleString('fr-FR') : '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Statut</div>
                      <div className={`font-bold inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs uppercase tracking-wider ${selectedRequest.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {selectedRequest.status === 'accepted' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {selectedRequest.status === 'accepted' ? 'Accepté' : 'Refusé'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Plateforme</div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-slate-400" />
                        {selectedRequest.payment_platform || '-'}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-slate-500 mb-1">RIB / IBAN cible</div>
                      <div className="font-bold text-slate-900 font-mono bg-white p-2 rounded-lg border border-slate-200">{selectedRequest.rib_iban || '-'}</div>
                    </div>
                    {selectedRequest.status === 'accepted' && (
                      <div className="col-span-2">
                        <div className="text-xs text-slate-500 mb-1">Référence du virement</div>
                        <div className="font-bold text-slate-900 font-mono bg-white p-2 rounded-lg border border-slate-200">{selectedRequest.transfer_reference || '-'}</div>
                      </div>
                    )}
                    <div className="col-span-2">
                      <div className="text-xs text-slate-500 mb-1">Note de traitement</div>
                      <div className="font-medium text-slate-700 bg-white p-3 rounded-lg border border-slate-200 min-h-[3rem] whitespace-pre-wrap">
                        {selectedRequest.admin_note || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Fermer
                </button>
                {selectedRequest.status === 'pending' && (
                  <button
                    type="submit"
                    disabled={processing}
                    className="px-6 py-2.5 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Valider
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}