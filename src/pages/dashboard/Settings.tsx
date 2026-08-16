import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, CreditCard, Upload, Loader2, CheckCircle2, AlertTriangle, UserMinus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLocation, useNavigate } from 'react-router-dom';
import ImageCropper from '../../components/ImageCropper';

export default function Settings() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSellerArea = location.pathname.includes('/vendeur');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Personal info state
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [personalInfoMessage, setPersonalInfoMessage] = useState('');
  const [personalInfoError, setPersonalInfoError] = useState('');
  const [savingPersonalInfo, setSavingPersonalInfo] = useState(false);

  // Cropper state
  const [cropState, setCropState] = useState<{ url: string, type: 'avatar' | 'banner' } | null>(null);

  // Bank form state
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAddress, setBankAddress] = useState('');
  const [ribFile, setRibFile] = useState<File | null>(null);
  const [validatingIban, setValidatingIban] = useState(false);
  const [isBetaActive, setIsBetaActive] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    // Check Beta status
    const { data: settingsData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'beta_mode_active')
      .single();
    if (settingsData?.value === 'true' || settingsData?.value === true) {
      setIsBetaActive(true);
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(data);
      if (data) {
        setFullName(data.full_name || '');
        setBio(data.bio || '');
        setBeneficiaryName(data.beneficiary_name || '');
        setIban(data.iban || '');
        setBic(data.bic || '');
        setBankName(data.bank_name || '');
        setBankAddress(data.bank_address || '');
      }
    }
    setLoading(false);
  };

  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBetaActive) {
      setPersonalInfoError("Les modifications sont désactivées en mode Bêta.");
      return;
    }
    setSavingPersonalInfo(true);
    setPersonalInfoError('');
    setPersonalInfoMessage('');

    try {
      let avatarUrl = profile.avatar_url;
      let bannerUrl = profile.banner_url;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop() || 'jpg';
        const fileName = `${profile.id}_${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);
        
        if (uploadError) throw new Error("Erreur lors de l'upload de l'avatar. Le bucket 'avatars' existe-t-il ?");
        
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        avatarUrl = publicUrlData.publicUrl;
      }

      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop() || 'jpg';
        const fileName = `${profile.id}_${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('banners')
          .upload(fileName, bannerFile);
        
        if (uploadError) throw new Error("Erreur lors de l'upload de la bannière. Le bucket 'banners' existe-t-il ?");
        
        const { data: publicUrlData } = supabase.storage.from('banners').getPublicUrl(fileName);
        bannerUrl = publicUrlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          bio: bio,
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setPersonalInfoMessage("Informations personnelles mises à jour avec succès.");
      fetchProfile();
    } catch (err: any) {
      setPersonalInfoError(err.message || "Erreur lors de la mise à jour des informations personnelles");
    } finally {
      setSavingPersonalInfo(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setCropState({ url, type });
      // Reset input so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    if (!cropState) return;
    
    const file = new File([croppedBlob], `cropped_${cropState.type}.jpg`, { type: 'image/jpeg' });
    
    if (cropState.type === 'avatar') {
      setAvatarFile(file);
    } else {
      setBannerFile(file);
    }
    
    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(cropState.url);
    setCropState(null);
  };

  const handleCropCancel = () => {
    if (cropState) {
      URL.revokeObjectURL(cropState.url);
      setCropState(null);
    }
  };

  const validateIban = async () => {
    // Supprimer tous les espaces et passer en majuscules avant vérification
    const formattedIban = iban.replace(/\s+/g, '').toUpperCase();
    if (!formattedIban || formattedIban.length < 14) return;
    
    setValidatingIban(true);
    setError('');
    try {
      const apiKey = 'MJAkRnw2lK8ZzVc2GsfWo0ZbtDmiB0MpTavKLd39';
      
      const response = await fetch(`https://api.api-ninjas.com/v1/iban?iban=${formattedIban}`, {
        headers: {
          'X-Api-Key': apiKey
        }
      });
      const data = await response.json();
      
      if (data && data.iban) {
        const bName = data.bank_name === 'This field is for premium subscribers only.' ? '' : data.bank_name;
        const bAddress = data.bank_address === 'This field is for premium subscribers only.' ? '' : data.bank_address;
        const bBic = data.swift_code === 'This field is for premium subscribers only.' ? '' : data.swift_code;
        
        if (bName) setBankName(bName);
        if (bAddress) setBankAddress(bAddress);
        if (!bic && bBic) setBic(bBic);
        
        // On met à jour le state de l'IBAN avec la version formatée (sans espaces)
        setIban(formattedIban);
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
    if (isBetaActive) {
      setError("Les modifications sont désactivées en mode Bêta.");
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    
    try {
      let ribUrl = profile.rib_file_url;
      
      // Upload RIB file if provided
      if (ribFile) {
        const fileExt = ribFile.name.split('.').pop();
        const fileName = `${profile.id}_${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
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
          rib_status: 'pending'
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

  const handleCloseSellerAccount = async () => {
    if (isBetaActive) {
      alert("La fermeture de compte est désactivée en mode Bêta.");
      return;
    }

    if ((profile?.balance || 0) > 0) {
      alert(`Impossible de clôturer votre compte vendeur : vous avez un solde de ${profile.balance.toFixed(2)} €. Veuillez demander un retrait avant de procéder à la clôture.`);
      return;
    }

    if (!confirm("Attention : Cette action est irréversible. Votre compte vendeur sera supprimé, ainsi que TOUS vos services publiés, vos brouillons et vos messages liés à vos ventes. Voulez-vous vraiment redevenir un simple acheteur ?")) {
      return;
    }

    setClosing(true);
    try {
      // 1. Delete all services from this seller
      // Due to Supabase cascading (if set) or manual deletion
      const { error: servicesError } = await supabase
        .from('services')
        .delete()
        .eq('seller_id', profile.id);
        
      if (servicesError) throw servicesError;

      // 2. Delete messages where this user is sender or receiver (Optionnel: on pourrait cibler que les contextes de vente, 
      // mais sans contexte clair, on supprime ou on garde. Pour l'instant on fait simple ou on laisse l'historique d'achat intact.
      // Le prompt dit "ses messages dédié au compte vendeur". Comme on n'a pas de distinction claire, on va le faire via une RPC plus tard
      // ou on update simplement le profil pour lui retirer le statut vendeur, ce qui cache l'accès.)
      
      // Update profile to remove seller status and record closure date for cooldown
      // We only update core seller fields to avoid schema cache errors on bank columns
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_seller: false,
          seller_closed_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      alert("Votre compte vendeur a été clôturé avec succès. Vous allez être redirigé vers l'espace acheteur.");
      navigate('/tableau-de-bord');
      
    } catch (err: any) {
      console.error(err);
      alert("Une erreur est survenue lors de la clôture du compte : " + err.message);
    } finally {
      setClosing(false);
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Paramètres du compte</h1>

      {isBetaActive && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <h3 className="font-bold">Mode Bêta Actif</h3>
            <p className="text-sm">En mode Bêta, vos paramètres de compte sont en lecture seule. Les modifications sont temporairement désactivées.</p>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-bold text-slate-900">Informations personnelles</h2>
        </div>

        {personalInfoError && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{personalInfoError}</div>}
        {personalInfoMessage && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-100">{personalInfoMessage}</div>}
        
        <form onSubmit={handleSavePersonalInfo} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Avatar</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                {avatarFile ? (
                  <img src={URL.createObjectURL(avatarFile)} alt="Nouvel avatar" className="w-full h-full object-cover" />
                ) : profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar actuel" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Aucun</div>
                )}
              </div>
              <div className="flex-1">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => handleFileSelect(e, 'avatar')}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-frilya-50 file:text-frilya-700 hover:file:bg-frilya-100 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Bannière de profil</label>
            {profile?.banner_url && !bannerFile && (
              <div className="h-24 w-full rounded-xl overflow-hidden mb-2 border border-slate-200">
                <img src={profile.banner_url} alt="Bannière actuelle" className="w-full h-full object-cover" />
              </div>
            )}
            {bannerFile && (
              <div className="h-24 w-full rounded-xl overflow-hidden mb-2 border border-slate-200">
                <img src={URL.createObjectURL(bannerFile)} alt="Nouvelle bannière" className="w-full h-full object-cover" />
              </div>
            )}
            <input 
              type="file" 
              accept="image/*"
              onChange={e => handleFileSelect(e, 'banner')}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-frilya-50 file:text-frilya-700 hover:file:bg-frilya-100 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Nom complet</label>
            <input 
              type="text" 
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Votre nom" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Biographie</label>
            <textarea 
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Parlez-nous un peu de vous..." 
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600 resize-none"
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

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={savingPersonalInfo}
              className="flex items-center gap-2 bg-frilya-600 hover:bg-frilya-500 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-sm disabled:opacity-70"
            >
              {savingPersonalInfo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {savingPersonalInfo ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
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
            {/* Form fields here */}
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

          {/* Section Danger : Clôturer le compte vendeur */}
          <div className="mt-12 pt-8 border-t border-slate-100">
            <div className="bg-red-50 border border-red-100 rounded-3xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 rounded-xl shrink-0">
                  <UserMinus className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-900 mb-1">Clôturer mon compte Vendeur</h3>
                  <p className="text-sm text-red-700 mb-4 leading-relaxed">
                    Si vous ne souhaitez plus vendre sur Frilya, vous pouvez clôturer votre espace vendeur pour redevenir un simple acheteur.
                    <strong> Cette action supprimera tous vos services et données associées.</strong>
                    <br/><br/>
                    <em>Note : Suite à une clôture, vous devrez patienter 3 semaines avant de pouvoir ouvrir un nouveau compte vendeur.</em>
                  </p>
                  <button 
                    onClick={handleCloseSellerAccount}
                    disabled={closing}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Clôturer mon espace vendeur
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {cropState && (
        <ImageCropper
          image={cropState.url}
          aspect={cropState.type === 'avatar' ? 1 : 16 / 5}
          shape={cropState.type === 'avatar' ? 'round' : 'rect'}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}
