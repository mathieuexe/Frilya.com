import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, History, CreditCard, AlertTriangle, Clock } from 'lucide-react';
import moneyIcon from '../../../assets/money.png';

export default function Revenus() {
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      .limit(10);
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
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de la demande.");
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-frilya-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 shrink-0">
              <img src={moneyIcon} alt="Revenus" className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Solde disponible</h2>
              <div className="text-4xl md:text-5xl font-black text-slate-900">
                {Number(profile?.balance || 0).toFixed(2).replace('.', ',')} €
              </div>
            </div>
          </div>
          
          <form onSubmit={handleRequestWithdrawal} className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 w-full md:w-auto">
            <h3 className="font-bold text-slate-900 text-sm">Demander un retrait</h3>
            {error && <div className="text-xs text-red-600 font-medium">{error}</div>}
            {success && <div className="text-xs text-emerald-600 font-medium">{success}</div>}
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={profile?.balance || 0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Montant"
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-frilya-600 focus:ring-2 focus:ring-frilya-600/10 font-bold pr-8"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
              </div>
              <button
                type="submit"
                disabled={requesting || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > (profile?.balance || 0)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Retirer
              </button>
            </div>
            {!profile?.iban && (
              <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Veuillez renseigner votre RIB dans les paramètres.
              </p>
            )}
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mes demandes de retrait */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-slate-400" />
            Demandes de retrait
          </h3>
          <div className="space-y-4">
            {requests.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Aucune demande de retrait.</p>
            ) : requests.map(req => (
              <div key={req.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900 text-lg">{Number(req.amount).toFixed(2)} €</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {new Date(req.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  {req.transfer_reference && (
                    <div className="text-xs text-slate-500 mt-1 font-mono">Réf: {req.transfer_reference}</div>
                  )}
                  {req.admin_note && (
                    <div className="text-xs text-slate-700 mt-1 bg-white p-2 rounded-lg border border-slate-200">Note admin: {req.admin_note}</div>
                  )}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider w-fit ${
                  req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  req.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {req.status === 'pending' ? 'En attente' : req.status === 'accepted' ? 'Effectué' : 'Refusé'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Historique des transactions */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" />
            Dernières transactions
          </h3>
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Aucune transaction.</p>
            ) : transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{tx.reason}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-black ${tx.direction === 'credit' ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {tx.direction === 'credit' ? '+' : '-'}{Number(tx.amount).toFixed(2)} €
                  </div>
                  <div className="text-xs text-slate-400 font-medium">Solde: {Number(tx.balance_after).toFixed(2)} €</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
