import { useState, useEffect } from 'react';
import { Power, Loader2, Percent, FileCheck, Check, X, PenTool } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function SettingsView() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowedIps, setAllowedIps] = useState<string>('');
  const [platformFee, setPlatformFee] = useState<string>('20');
  const [signature, setSignature] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);
  const [signatureLoading, setSignatureLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // RIB Verification State
  const [pendingRibs, setPendingRibs] = useState<any[]>([]);
  const [ribLoading, setRibLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchUserAndSettings();
    fetchPendingRibs();
  }, []);

  const fetchUserAndSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('signature')
          .eq('id', session.user.id)
          .single();
          
        if (profileData && profileData.signature) {
          setSignature(profileData.signature);
        }
      }
      await fetchSettings();
    } catch (err) {
      console.error("Erreur session", err);
    }
  };

  const fetchPendingRibs = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('rib_status', 'pending');
        
      if (error) throw error;
      setPendingRibs(data || []);
    } catch (err) {
      console.error("Erreur lors de la récupération des RIB:", err);
    }
  };

  const handleRibAction = async (userId: string, status: 'approved' | 'rejected') => {
    setRibLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ rib_status: status })
        .eq('id', userId);
        
      if (error) throw error;
      
      setPendingRibs(prev => prev.filter(rib => rib.id !== userId));
      alert(`RIB ${status === 'approved' ? 'approuvé' : 'refusé'} avec succès.`);
    } catch (err) {
      console.error("Erreur lors du traitement du RIB:", err);
      alert("Une erreur est survenue lors du traitement.");
    } finally {
      setRibLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();

      if (maintenanceError && maintenanceError.code !== 'PGRST116') throw maintenanceError;
      
      if (maintenanceData) {
        setMaintenanceMode(maintenanceData.value === true || maintenanceData.value === 'true');
      }

      const { data: ipData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'maintenance_allowed_ips')
        .single();
        
      if (ipData?.value) {
        try {
          const parsed = typeof ipData.value === 'string' ? JSON.parse(ipData.value) : ipData.value;
          if (Array.isArray(parsed)) {
            setAllowedIps(parsed.join(', '));
          }
        } catch (e) {
          console.error(e);
        }
      }

      const { data: feeData, error: feeError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'platform_fee_percentage')
        .single();

      if (feeError && feeError.code !== 'PGRST116') throw feeError;
      
      if (feeData) {
        setPlatformFee(feeData.value.toString());
      }
    } catch (err: any) {
      console.error("Erreur lors de la récupération des paramètres:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMaintenance = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const newValue = !maintenanceMode;
      const { error: upsertError } = await supabase
        .from('settings')
        .upsert({ key: 'maintenance_mode', value: newValue }, { onConflict: 'key' });

      if (upsertError) throw upsertError;
      setMaintenanceMode(newValue);
    } catch (err: any) {
      console.error("Erreur lors de la modification:", err);
      setError("Impossible de modifier le mode maintenance.");
    } finally {
      setActionLoading(false);
    }
  };

  const saveAllowedIps = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const ipsArray = allowedIps.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
      const { error: upsertError } = await supabase
        .from('settings')
        .upsert({ key: 'maintenance_allowed_ips', value: JSON.stringify(ipsArray) }, { onConflict: 'key' });

      if (upsertError) throw upsertError;
      alert("Adresses IP autorisées mises à jour.");
    } catch (err: any) {
      console.error("Erreur lors de la sauvegarde des IPs:", err);
      setError("Impossible de sauvegarder les IPs.");
    } finally {
      setActionLoading(false);
    }
  };

  const savePlatformFee = async () => {
    setFeeLoading(true);
    setError(null);
    try {
      const feeNumber = parseFloat(platformFee);
      if (isNaN(feeNumber) || feeNumber < 0 || feeNumber > 100) {
        throw new Error("Le pourcentage de frais doit être un nombre entre 0 et 100.");
      }

      const { error: upsertError } = await supabase
        .from('settings')
        .upsert({ key: 'platform_fee_percentage', value: feeNumber.toString() }, { onConflict: 'key' });

      if (upsertError) throw upsertError;
      alert("Frais d'utilisation mis à jour avec succès.");
    } catch (err: any) {
      console.error("Erreur lors de la modification des frais:", err);
      setError(err.message || "Impossible de modifier les frais d'utilisation.");
    } finally {
      setFeeLoading(false);
    }
  };

  const saveSignature = async () => {
    if (!user) return;
    setSignatureLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ signature: signature })
        .eq('id', user.id);

      if (updateError) throw updateError;
      alert("Signature mise à jour avec succès.");
    } catch (err: any) {
      console.error("Erreur lors de la sauvegarde de la signature:", err);
      setError("Impossible de sauvegarder la signature.");
    } finally {
      setSignatureLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-frilya-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-start gap-3">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Carte Maintenance */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Mode Maintenance</h2>
              <p className="text-slate-500 text-sm mt-1">Activer ou désactiver l'accès au site</p>
            </div>
            <div className={`p-3 rounded-2xl ${maintenanceMode ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
              <Power className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">Statut actuel :</span>
              <span className={`font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider ${maintenanceMode ? 'bg-amber-500 text-white' : 'bg-green-500 text-white'}`}>
                {maintenanceMode ? 'Activé' : 'Désactivé'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-3 mb-4">
              {maintenanceMode 
                ? "Les visiteurs sont redirigés vers la page /maintenance." 
                : "Le site est accessible normalement à tous les visiteurs."}
            </p>

            <div className="border-t border-slate-200 pt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Adresses IP autorisées (séparées par des virgules)
              </label>
              <input
                type="text"
                value={allowedIps}
                onChange={(e) => setAllowedIps(e.target.value)}
                placeholder="ex: 192.168.1.1, 10.0.0.1"
                className="w-full pl-4 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-frilya-600 transition-shadow bg-white text-sm mb-3"
              />
              <button
                onClick={saveAllowedIps}
                disabled={actionLoading}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Sauvegarder les IPs
              </button>
            </div>
          </div>

          <button
            onClick={toggleMaintenance}
            disabled={actionLoading}
            className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm ${
              maintenanceMode 
                ? 'bg-slate-900 hover:bg-slate-800 text-white' 
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            } disabled:opacity-50`}
          >
            {actionLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Power className="w-5 h-5" />
                {maintenanceMode ? 'Désactiver la maintenance' : 'Activer la maintenance'}
              </>
            )}
          </button>
        </div>

        {/* Carte Frais */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Frais d'utilisation Frilya</h2>
              <p className="text-slate-500 text-sm mt-1">Commission prélevée sur chaque commande (en %)</p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-100 text-blue-600">
              <Percent className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Pourcentage appliqué</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={platformFee}
                onChange={(e) => setPlatformFee(e.target.value)}
                className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-frilya-600 transition-shadow bg-white font-bold text-lg"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                %
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Ces frais seront ajoutés au montant HT du service lors de la commande de l'acheteur.
            </p>
          </div>

          <button
            onClick={savePlatformFee}
            disabled={feeLoading}
            className="w-full flex items-center justify-center gap-2 font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm bg-frilya-900 hover:bg-frilya-800 text-white disabled:opacity-50"
          >
            {feeLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Enregistrer les frais'
            )}
          </button>
        </div>

        {/* Carte Signature Admin */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Signature des Messages</h2>
              <p className="text-slate-500 text-sm mt-1">Ajoutée automatiquement à la fin de vos messages privés</p>
            </div>
            <div className="p-3 rounded-2xl bg-purple-100 text-purple-600">
              <PenTool className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Votre signature personnalisée</label>
            <textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Cordialement,&#10;L'équipe Support"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-frilya-600 transition-shadow bg-white text-sm resize-none"
            />
            <p className="text-xs text-slate-500 mt-3">
              Laissez ce champ vide pour ne pas utiliser de signature.
            </p>
          </div>

          <button
            onClick={saveSignature}
            disabled={signatureLoading}
            className="w-full flex items-center justify-center gap-2 font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
          >
            {signatureLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Enregistrer la signature'
            )}
          </button>
        </div>
      </div>

      {/* Carte Vérification RIB */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Vérification des RIB</h2>
            <p className="text-slate-500 text-sm mt-1">Valider ou refuser les coordonnées bancaires des vendeurs</p>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-600">
            <FileCheck className="w-6 h-6" />
          </div>
        </div>

        {pendingRibs.length === 0 ? (
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl text-center">
            <p className="text-slate-500">Aucun document en attente de vérification.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRibs.map((rib) => (
              <div key={rib.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                  <h3 className="font-bold text-slate-900">{rib.beneficiary_name} <span className="text-sm font-normal text-slate-500">({rib.email})</span></h3>
                  <p className="text-sm text-slate-600 mt-1">IBAN: <span className="font-mono">{rib.iban}</span></p>
                  <p className="text-xs text-slate-500 mt-1">Banque: {rib.bank_name}</p>
                  {rib.rib_file_url && (
                    <a href={rib.rib_file_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-sm text-frilya-600 font-bold hover:underline">
                      Voir le document PDF/Image
                    </a>
                  )}
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={() => handleRibAction(rib.id, 'rejected')}
                    disabled={ribLoading}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 py-2 px-4 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" /> Refuser
                  </button>
                  <button
                    onClick={() => handleRibAction(rib.id, 'approved')}
                    disabled={ribLoading}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 py-2 px-4 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" /> Approuver
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
