import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, CreditCard, Upload, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLocation } from 'react-router-dom';

export default function Settings() {
  const location = useLocation();
  const isSellerArea = location.pathname.includes('/vendeur');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Bank form state
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAddress, setBankAddress] = useState('');
  const [ribFile, setRibFile] = useState<File | null>(null);
  const [validatingIban, setValidatingIban] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(data);
      if (data) {
        setBeneficiaryName(data.beneficiary_name || '');
        setIban(data.iban || '');
        setBic(data.bic || '');
        setBankName(data.bank_name || '');
        setBankAddress(data.bank_address || '');
      }
    }
    setLoading(false);
  };

  const validateIban = async () => {
    if (!iban || iban.length < 14) return;
    setValidatingIban(true);
    setError('');
    try {
      const apiKey = import.meta.env.VITE_IBANAPI_KEY;
      if (!apiKey) {
        throw new Error("Clé API ibanapi manquante (VITE_IBANAPI_KEY)");
      }
      
      const response = await fetch(`https://api.ibanapi.com/v1/validate/${iban}?api_key=${apiKey}`);
      const data = await response.json();
      
      if (data.result === 200 && data.validations.chars.is_valid && data.validations.checksum.is_valid) {
        setBankName(data.bank_data.bank || '');
        setBankAddress(`${data.bank_data.address || ''}, ${data.bank_data.city || ''}`.trim());
        if (!bic) setBic(data.bank_data.bic || '');
      } else {
        setError("L'IBAN saisi semble invalide.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Impossible de vérifier l'IBAN via l'API.");
    } finally {
      setValidatingIban(false);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    
    try {
      let ribUrl = profile.rib_file_url;
      
      // Upload RIB file if provided
      if (ribFile) {
        const fileExt = ribFile.name.split('.').pop();
        const fileName = `${profile.id}_${Math.random()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('documents')
          .upload(`ribs/${fileName}`, ribFile);
          
        if (uploadError) {
          // Si le bucket n'existe pas, on l'affiche explicitement
          throw new Error("Erreur d'upload du RIB (le bucket 'documents' existe-t-il sur Supabase?)");
        }
        
        const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(`ribs/${fileName}`);
        ribUrl = publicUrlData.publicUrl;
      }
      
      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          beneficiary_name: beneficiaryName,
          iban: iban,
          bic: bic,
          bank_name: bankName,
          bank_address: bankAddress,
          rib_file_url: ribUrl,
          rib_status: (ribUrl || profile.rib_file_url) ? 'pending' : profile.rib_status
        })
        .eq('id', profile.id);
        
      if (updateError) throw updateError;
      
      setMessage("Coordonnées bancaires enregistrées. Vérification en cours par nos équipes.");
      fetchProfile(); // Refresh
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Paramètres du compte</h1>
      
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-bold text-slate-900">Informations personnelles</h2>
        </div>
        
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Nom complet</label>
            <input 
              type="text" 
              defaultValue={profile?.full_name}
              placeholder="Votre nom" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
            <input 
              type="email" 
              defaultValue={profile?.email}
              disabled
              placeholder="Votre email" 
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 outline-none opacity-70"
            />
          </div>
        </form>
      </div>

      {isSellerArea && profile?.is_seller && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 max-w-2xl mt-8">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <CreditCard className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900">Coordonnées bancaires (Virements)</h2>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>}
          {message && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-100">{message}</div>}

          {profile.rib_status === 'approved' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-green-800">RIB Validé</h3>
                <p className="text-sm text-green-700 mt-1">Vos coordonnées bancaires sont approuvées. Vous pouvez recevoir vos virements.</p>
              </div>
            </div>
          )}

          {profile.rib_status === 'rejected' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-800">RIB Refusé</h3>
                <p className="text-sm text-red-700 mt-1">Votre document a été refusé. Veuillez en fournir un nouveau ci-dessous.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveBank} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nom et prénom du bénéficiaire</label>
              <input 
                type="text" 
                required
                value={beneficiaryName}
                onChange={e => setBeneficiaryName(e.target.value)}
                placeholder="Ex: Jean Dupont" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">IBAN</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  required
                  value={iban}
                  onChange={e => setIban(e.target.value)}
                  onBlur={validateIban}
                  placeholder="FR76..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600 uppercase"
                />
                {validatingIban && <div className="px-3 flex items-center"><Loader2 className="w-5 h-5 animate-spin text-frilya-600" /></div>}
              </div>
              <p className="text-xs text-slate-500 mt-1">Renseignez votre IBAN pour rechercher automatiquement votre banque.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">BIC / SWIFT</label>
                <input 
                  type="text" 
                  required
                  value={bic}
                  onChange={e => setBic(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nom de la banque</label>
                <input 
                  type="text" 
                  required
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Adresse de la banque</label>
              <input 
                type="text" 
                value={bankAddress}
                onChange={e => setBankAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Relevé d'Identité Bancaire (RIB en PDF)</label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors">
                <input 
                  type="file" 
                  accept=".pdf,image/*" 
                  onChange={e => setRibFile(e.target.files ? e.target.files[0] : null)}
                  className="hidden" 
                  id="rib-upload" 
                />
                <label htmlFor="rib-upload" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-sm font-medium text-slate-700">
                    {ribFile ? ribFile.name : "Cliquez pour uploader votre RIB"}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">PDF ou Image (Max 5Mo)</span>
                </label>
              </div>
              {profile.rib_file_url && !ribFile && (
                <p className="text-xs text-green-600 mt-2">✓ Un document est déjà enregistré.</p>
              )}
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-sm disabled:opacity-50 mt-4"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer et demander vérification
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
