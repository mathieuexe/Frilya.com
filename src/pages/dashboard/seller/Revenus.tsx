import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, Info, Landmark, ShoppingCart, ChevronRight, CheckCircle2, Circle, XCircle, AlertTriangle } from 'lucide-react';

export default function Revenus() {
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Transfer Request Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Transfer Detail Modal
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    setProfile(p);

    const { data: txs } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setTransactions(txs || []);

    const { data: reqs } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('seller_id', session.user.id)
      .order('created_at', { ascending: false });
    setRequests(reqs || []);

    setLoading(false);
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!profile?.iban) {
      setError("Vous devez renseigner votre RIB dans les paramètres avant de demander un retrait.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Montant invalide.");
      return;
    }

    if (numAmount > (profile.balance || 0)) {
      setError("Fonds insuffisants.");
      return;
    }

    setRequesting(true);
    try {
      const { error } = await supabase.rpc('request_withdrawal', { p_amount: numAmount });
      if (error) throw error;

      setSuccess(`Demande de retrait de ${numAmount.toFixed(2)} € envoyée avec succès.`);
      setAmount('');
      fetchData(); // refresh data
      setTimeout(() => {
        setIsTransferModalOpen(false);
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de la demande.");
    } finally {
      setRequesting(false);
    }
  };

  const formatIban = (iban: string) => {
    if (!iban) return 'Compte bancaire';
    const clean = iban.replace(/\s/g, '');
    if (clean.length < 8) return clean;
    return `${clean.substring(0, 4)} **** ${clean.substring(clean.length - 4)}`;
  };

  const unifiedItems = [
    ...transactions
      .filter(tx => tx.reason !== 'Demande de retrait')
      .map(tx => ({
        id: `tx_${tx.id}`,
        type: 'transaction',
        title: tx.reason || 'Transaction',
        subtitle: '',
        amount: Number(tx.amount),
        direction: tx.direction,
        date: new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
        timestamp: new Date(tx.created_at).getTime(),
        raw: tx
      })),
    ...requests.map(req => ({
      id: `req_${req.id}`,
      type: 'withdrawal',
      title: 'Transfert vers le compte bancaire',
      subtitle: formatIban(req.rib_iban || profile?.iban),
      amount: Number(req.amount),
      direction: 'debit',
      date: new Date(req.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      timestamp: new Date(req.created_at).getTime(),
      raw: req
    }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-frilya-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Top Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center text-slate-600 text-sm font-medium">
          <span>Montant en attente</span>
          <span className="flex items-center gap-1.5">
            0,00 € 
            <Info className="w-4 h-4 text-slate-400" />
          </span>
        </div>
        
        <div className="p-10 text-center flex flex-col items-center">
          <div className="text-4xl font-bold text-slate-900 mb-2">
            {Number(profile?.balance || 0).toFixed(2).replace('.', ',')} €
          </div>
          <div className="text-slate-500 text-sm mb-10 font-medium">Montant disponible</div>
          
          <div className="flex gap-10 justify-center">
            <button 
              onClick={() => setIsTransferModalOpen(true)} 
              className="flex flex-col items-center gap-3 group"
            >
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-slate-200 transition-colors shadow-sm">
                <Landmark className="w-7 h-7" />
              </div>
              <span className="text-sm text-slate-600 font-medium">Transférer</span>
            </button>
            
            <button className="flex flex-col items-center gap-3 group opacity-50 cursor-not-allowed" title="Bientôt disponible">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 transition-colors shadow-sm">
                <ShoppingCart className="w-7 h-7" />
              </div>
              <span className="text-sm text-slate-600 font-medium">Acheter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-slate-600 text-sm font-medium">Transactions</h3>
        </div>
        
        <div className="divide-y divide-slate-100">
          {unifiedItems.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">Aucune transaction pour le moment.</p>
          ) : unifiedItems.map(item => (
            <div 
              key={item.id} 
              className={`p-4 flex justify-between items-center transition-colors ${item.type === 'withdrawal' ? 'cursor-pointer hover:bg-slate-50' : ''}`}
              onClick={() => item.type === 'withdrawal' && setSelectedRequest(item.raw)}
            >
              <div>
                <div className="font-bold text-slate-900 text-[15px]">{item.title}</div>
                {item.subtitle && <div className="text-slate-500 text-sm mt-0.5">{item.subtitle}</div>}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={`font-bold text-[15px] ${item.direction === 'debit' ? 'text-rose-600' : 'text-slate-900'}`}>
                    {item.direction === 'debit' ? '-' : ''}{item.amount.toFixed(2).replace('.', ',')} €
                  </div>
                  <div className="text-slate-500 text-sm mt-0.5">{item.date}</div>
                </div>
                <ChevronRight className={`w-5 h-5 ${item.type === 'withdrawal' ? 'text-slate-400' : 'text-transparent'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transfer Request Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Demander un transfert</h3>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleRequestWithdrawal} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium">{error}</div>}
              {success && <div className="p-3 bg-emerald-50 text-emerald-600 text-sm rounded-xl font-medium">{success}</div>}
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Montant à transférer</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={profile?.balance || 0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg focus:outline-none focus:border-frilya-600 focus:ring-2 focus:ring-frilya-600/10 font-bold pr-12"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
                </div>
                <div className="text-xs text-slate-500 mt-2 font-medium">Solde disponible : {Number(profile?.balance || 0).toFixed(2).replace('.', ',')} €</div>
              </div>

              {!profile?.iban && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-amber-700 text-sm mt-4">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p>Veuillez renseigner votre RIB dans les paramètres de votre compte avant de demander un retrait.</p>
                </div>
              )}

              <button
                type="submit"
                disabled={requesting || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > (profile?.balance || 0) || !profile?.iban}
                className="w-full mt-6 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {requesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Landmark className="w-5 h-5" />}
                Valider le transfert
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white border-b border-slate-200 p-5 flex justify-between items-center relative">
              <div className="font-bold text-slate-900 text-lg">Montant du transfert</div>
              <div className="text-slate-500 font-medium text-lg">{Number(selectedRequest.amount).toFixed(2).replace('.', ',')} €</div>
              <button 
                onClick={() => setSelectedRequest(null)} 
                className="absolute top-2 right-2 p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full hover:bg-slate-100 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 bg-slate-50/50 min-h-[300px]">
              <div className="text-slate-500 text-sm mb-8 font-medium">Statut du transfert</div>
              
              <div className="relative pl-10 space-y-12">
                {/* Line connecting steps */}
                <div className="absolute left-3.5 top-2 bottom-2 w-[2px] bg-slate-200"></div>
                
                {/* Step 1 */}
                <div className="relative z-10">
                  <div className="absolute -left-10 top-0.5 bg-slate-50/50 rounded-full">
                    <CheckCircle2 className="w-7 h-7 text-teal-600 bg-white rounded-full" />
                  </div>
                  <div className="font-bold text-slate-900 text-[15px]">Transfert en cours</div>
                  <div className="text-slate-500 text-sm mt-1">
                    {new Date(selectedRequest.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(' à ', ', ')}
                  </div>
                </div>
                
                {/* Step 2 */}
                <div className="relative z-10">
                  <div className="absolute -left-10 top-0.5 bg-slate-50/50 rounded-full">
                    {selectedRequest.status === 'accepted' ? (
                      <CheckCircle2 className="w-7 h-7 text-teal-600 bg-white rounded-full" />
                    ) : selectedRequest.status === 'rejected' ? (
                      <XCircle className="w-7 h-7 text-red-600 bg-white rounded-full" />
                    ) : (
                      <Circle className="w-7 h-7 text-slate-300 bg-white rounded-full" />
                    )}
                  </div>
                  <div className={`font-bold text-[15px] ${selectedRequest.status === 'pending' ? 'text-slate-500' : 'text-slate-900'}`}>
                    Transfert vers {formatIban(selectedRequest.rib_iban || profile?.iban)} {selectedRequest.status === 'accepted' ? 'effectué' : selectedRequest.status === 'rejected' ? 'refusé' : 'estimé pour :'}
                  </div>
                  <div className="text-slate-500 text-sm mt-1">
                    {selectedRequest.status === 'pending' 
                      ? new Date(new Date(selectedRequest.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                      : new Date(selectedRequest.processed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}