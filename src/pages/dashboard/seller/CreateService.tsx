import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { Loader2, ArrowLeft, CheckCircle2, X, Plus, Trash2, UploadCloud, Image as ImageIcon, Video, AlertCircle } from 'lucide-react';
import { CATEGORY_HIERARCHY } from '../../../lib/categories';

type PackageType = {
  id?: string | null;
  name: string;
  description: string;
  price: number;
  delivery_days: number;
  revisions_included: number;
};

type PackagesState = {
  basic: PackageType;
  standard: PackageType;
  premium: PackageType;
};

export default function CreateService() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(id || null);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    sub_category: '',
    search_tags: [] as string[],
    description: '',
  });

  const [packages, setPackages] = useState<PackagesState>({
    basic: { id: null, name: 'Basique', description: '', price: 5, delivery_days: 1, revisions_included: 1 },
    standard: { id: null, name: 'Standard', description: '', price: 15, delivery_days: 3, revisions_included: 2 },
    premium: { id: null, name: 'Premium', description: '', price: 30, delivery_days: 5, revisions_included: 3 }
  });

  const [extras, setExtras] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [requirements, setRequirements] = useState<any[]>([]);

  const steps = [
    { num: 1, label: 'Vue d\'ensemble' },
    { num: 2, label: 'Tarification' },
    { num: 3, label: 'Description & FAQ' },
    { num: 4, label: 'Galerie' },
    { num: 5, label: 'Exigences' },
    { num: 6, label: 'Publication' }
  ];

  const [isBetaActive, setIsBetaActive] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    // Check Beta status
    const { data: settingsData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'beta_mode_active')
      .single();
    if (settingsData?.value === 'true' || settingsData?.value === true) {
      setIsBetaActive(true);
    }

    try {
      // Fetch categories
      const { data: cats } = await supabase.from('categories').select('*').order('name');
      if (cats) setCategories(cats);

      if (id) {
        // Fetch service
        const { data: s, error: sErr } = await supabase.from('services').select('*').eq('id', id).single();
        if (sErr) throw sErr;
        
        setFormData({
          title: s.title || '',
          category_id: s.category_id?.toString() || '',
          sub_category: s.sub_category || '',
          search_tags: s.search_tags || [],
          description: s.description || '',
        });

        // Fetch packages
        const { data: p } = await supabase.from('service_packages').select('*').eq('service_id', id);
        if (p && p.length > 0) {
          const newPackages = { ...packages };
          p.forEach(pkg => {
            if (pkg.package_type === 'basic' || pkg.package_type === 'standard' || pkg.package_type === 'premium') {
              const type = pkg.package_type as keyof PackagesState;
              newPackages[type] = {
                id: pkg.id,
                name: pkg.name || '',
                description: pkg.description || '',
                price: pkg.price || 5,
                delivery_days: pkg.delivery_days || 1,
                revisions_included: pkg.revisions_included || 0
              };
            }
          });
          setPackages(newPackages);
        }

        // Fetch extras
        const { data: e } = await supabase.from('service_extras').select('*').eq('service_id', id);
        if (e) setExtras(e);

        // Fetch faqs
        const { data: f } = await supabase.from('service_faqs').select('*').eq('service_id', id);
        if (f) setFaqs(f);

        // Fetch media
        const { data: m } = await supabase.from('service_media').select('*').eq('service_id', id).order('position');
        if (m) setMedia(m);

        // Fetch requirements
        const { data: reqs } = await supabase.from('service_requirements').select('*').eq('service_id', id);
        if (reqs) setRequirements(reqs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    if (!slug) slug = 'service-' + Date.now();
    return slug;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non authentifié");

      // Synchroniser le prix et délai de base avec le package basique pour la recherche
      const basicPrice = packages.basic.price || 5;
      const basicDelivery = packages.basic.delivery_days || 1;

      // Base slug calculation
      const baseSlug = generateSlug(formData.title || 'brouillon');
      let finalSlug = baseSlug;

      // Ensure slug uniqueness if creating new
      if (!serviceId) {
        let slugExists = true;
        let counter = 1;
        while (slugExists) {
          const { data } = await supabase.from('services').select('id').eq('slug', finalSlug).maybeSingle();
          if (data) {
            finalSlug = `${baseSlug}-${counter}`;
            counter++;
          } else {
            slugExists = false;
          }
        }
      }

      const serviceData: any = {
        seller_id: session.user.id,
        title: formData.title || 'Brouillon sans titre',
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        sub_category: formData.sub_category,
        search_tags: formData.search_tags,
        description: formData.description || 'Description en attente...',
        price_basic: basicPrice,
        delivery_time_days: basicDelivery,
        status: 'draft',
        cover_image_url: media.length > 0 ? media[0].url : null
      };

      if (!serviceId) {
        serviceData.slug = finalSlug;
      }

      let currentServiceId = serviceId;

      if (currentServiceId) {
        const { error } = await supabase.from('services').update(serviceData).eq('id', currentServiceId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('services').insert([serviceData]).select().single();
        if (error) throw error;
        currentServiceId = data.id;
        setServiceId(currentServiceId);
        window.history.replaceState(null, '', `/tableau-de-bord/vendeur/services/edition/${currentServiceId}`);
      }

      // Sauvegarder les Packages (uniquement si l'étape 2 a été atteinte ou si on a un ID)
      if (currentStep >= 2 || currentServiceId) {
        const packagesToSave = [
          { ...packages.basic, service_id: currentServiceId, package_type: 'basic' },
          { ...packages.standard, service_id: currentServiceId, package_type: 'standard' },
          { ...packages.premium, service_id: currentServiceId, package_type: 'premium' }
        ];
        
        for (const pkg of packagesToSave) {
          if (pkg.id) {
            await supabase.from('service_packages').update(pkg).eq('id', pkg.id);
          } else {
            const { data } = await supabase.from('service_packages').insert([pkg]).select().single();
            if (data) {
              setPackages(prev => ({
                ...prev,
                [pkg.package_type]: { ...prev[pkg.package_type as keyof typeof packages], id: data.id }
              }));
            }
          }
        }

        // Sauvegarder les Extras
        for (const extra of extras) {
           if (extra.id) {
             await supabase.from('service_extras').update({
               name: extra.name, description: extra.description, price_add: extra.price_add, delivery_add_days: extra.delivery_add_days
             }).eq('id', extra.id);
           } else {
             const { data } = await supabase.from('service_extras').insert([{
               service_id: currentServiceId, name: extra.name, description: extra.description, price_add: extra.price_add, delivery_add_days: extra.delivery_add_days
             }]).select().single();
             if (data) {
               setExtras(prev => prev.map(e => e === extra ? { ...e, id: data.id } : e));
             }
           }
        }

        // Sauvegarder les FAQs
        for (const faq of faqs) {
           if (faq.id) {
             await supabase.from('service_faqs').update({
               question: faq.question, answer: faq.answer
             }).eq('id', faq.id);
           } else {
             const { data } = await supabase.from('service_faqs').insert([{
               service_id: currentServiceId, question: faq.question, answer: faq.answer
             }]).select().single();
             if (data) {
               setFaqs(prev => prev.map(f => f === faq ? { ...f, id: data.id } : f));
             }
           }
        }

        // Sauvegarder les Médias
        for (let i = 0; i < media.length; i++) {
           const m = media[i];
           if (m.id) {
             await supabase.from('service_media').update({
               position: i
             }).eq('id', m.id);
           } else {
             const { data } = await supabase.from('service_media').insert([{
               service_id: currentServiceId, url: m.url, media_type: m.media_type, position: i
             }]).select().single();
             if (data) {
               setMedia(prev => prev.map(item => item === m ? { ...item, id: data.id, position: i } : item));
             }
           }
        }

        // Sauvegarder les Exigences
        for (const req of requirements) {
           if (req.id) {
             await supabase.from('service_requirements').update({
               question: req.question, response_type: req.response_type, is_required: req.is_required
             }).eq('id', req.id);
           } else {
             const { data } = await supabase.from('service_requirements').insert([{
               service_id: currentServiceId, question: req.question, response_type: req.response_type, is_required: req.is_required
             }]).select().single();
             if (data) {
               setRequirements(prev => prev.map(r => r === req ? { ...r, id: data.id } : r));
             }
           }
        }
      }

    } catch (error) {
      console.error("Erreur de sauvegarde :", error);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    // Validation basique
    if (currentStep === 1 && !formData.title.trim()) {
      alert("Le titre est obligatoire pour continuer.");
      return;
    }
    if (currentStep === 3 && !formData.description.trim()) {
      alert("La description est obligatoire pour continuer.");
      return;
    }
    if (currentStep === 4 && media.length === 0) {
      alert("Vous devez ajouter au moins une image de couverture.");
      return;
    }
    if (currentStep === 5) {
      const emptyReqs = requirements.some(req => !req.question.trim());
      if (emptyReqs) {
        alert("Veuillez remplir toutes les questions des exigences ou les supprimer.");
        return;
      }
    }
    
    if (currentStep === 6) {
      setSaving(true);
      try {
        if (serviceId) {
          const { error } = await supabase.from('services').update({ status: 'active' }).eq('id', serviceId);
          if (error) throw error;
          navigate('/tableau-de-bord/vendeur/services');
        }
      } catch (err) {
        console.error(err);
        alert("Erreur lors de la publication.");
      } finally {
        setSaving(false);
      }
      return;
    }

    await handleSaveDraft();
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (newTag && formData.search_tags.length < 5 && !formData.search_tags.includes(newTag)) {
        setFormData({ ...formData, search_tags: [...formData.search_tags, newTag] });
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ ...formData, search_tags: formData.search_tags.filter(t => t !== tagToRemove) });
  };

  const addExtra = () => {
    setExtras([...extras, { id: null, name: '', description: '', price_add: 5, delivery_add_days: 1 }]);
  };

  const removeExtra = async (index: number, extraId: string | null) => {
    if (extraId) {
      await supabase.from('service_extras').delete().eq('id', extraId);
    }
    const newExtras = [...extras];
    newExtras.splice(index, 1);
    setExtras(newExtras);
  };

  const addFaq = () => {
    setFaqs([...faqs, { id: null, question: '', answer: '' }]);
  };

  const removeFaq = async (index: number, faqId: string | null) => {
    if (faqId) {
      await supabase.from('service_faqs').delete().eq('id', faqId);
    }
    const newFaqs = [...faqs];
    newFaqs.splice(index, 1);
    setFaqs(newFaqs);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation (max 5MB, images/videos)
    if (file.size > 5 * 1024 * 1024) {
      alert("Le fichier est trop volumineux (max 5 Mo).");
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      alert("Format non supporté. Veuillez uploader une image ou une vidéo.");
      return;
    }

    setUploadingMedia(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${serviceId || 'temp'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('service_media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('service_media')
        .getPublicUrl(filePath);

      setMedia([...media, {
        id: null,
        url: publicUrl,
        media_type: isVideo ? 'video' : 'image',
        position: media.length
      }]);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'upload du média.");
    } finally {
      setUploadingMedia(false);
      e.target.value = ''; // reset
    }
  };

  const removeMedia = async (index: number, mediaId: string | null, url: string) => {
    try {
      if (mediaId) {
        await supabase.from('service_media').delete().eq('id', mediaId);
      }
      
      // Essayer de supprimer de Storage
      try {
        const path = url.split('/service_media/')[1];
        if (path) {
          await supabase.storage.from('service_media').remove([path]);
        }
      } catch (e) {
        console.error("Storage delete error", e);
      }

      const newMedia = [...media];
      newMedia.splice(index, 1);
      setMedia(newMedia);
    } catch (err) {
      console.error(err);
    }
  };

  const addRequirement = () => {
    setRequirements([...requirements, { id: null, question: '', response_type: 'text', is_required: true }]);
  };

  const removeRequirement = async (index: number, reqId: string | null) => {
    if (reqId) {
      await supabase.from('service_requirements').delete().eq('id', reqId);
    }
    const newReqs = [...requirements];
    newReqs.splice(index, 1);
    setRequirements(newReqs);
  };

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-frilya-600" /></div>;
  }

  if (isBetaActive) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-amber-50 rounded-3xl border border-amber-200 p-8 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-amber-800 mb-2">Création / Édition désactivée</h2>
        <p className="text-amber-700">En mode Bêta, il n'est pas possible de créer ou de modifier des annonces.</p>
        <button onClick={() => navigate('/dashboard/vendeur')} className="mt-6 px-6 py-2 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors">
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  const selectedCategoryName = categories.find(c => c.id.toString() === formData.category_id)?.name;
  const availableSubCategories = selectedCategoryName ? CATEGORY_HIERARCHY[selectedCategoryName] || [] : [];

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to="/tableau-de-bord/vendeur/services" className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            {serviceId ? 'Modifier l\'annonce' : 'Créer une nouvelle annonce'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 font-medium">
            {saving ? 'Sauvegarde...' : 'Sauvegardé'}
          </span>
          <button onClick={handleSaveDraft} className="text-frilya-600 hover:text-frilya-700 font-bold text-sm bg-frilya-50 px-4 py-2 rounded-lg transition-colors">
            Enregistrer le brouillon
          </button>
        </div>
      </div>

      {/* Wizard Navigation */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-8 overflow-x-auto">
        <div className="flex items-center min-w-max">
          {steps.map((step, index) => (
            <div key={step.num} className="flex items-center">
              <div 
                className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-colors ${
                  currentStep === step.num ? 'bg-frilya-900 text-white' : 
                  currentStep > step.num ? 'bg-green-500 text-white' : 
                  'bg-slate-100 text-slate-400'
                }`}
              >
                {currentStep > step.num ? <CheckCircle2 className="w-5 h-5" /> : step.num}
              </div>
              <span className={`ml-3 text-sm font-bold ${currentStep === step.num ? 'text-slate-900' : 'text-slate-500'}`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className="w-12 h-0.5 mx-4 bg-slate-100"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ETAPE 1 : Vue d'ensemble */}
      {currentStep === 1 && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm mb-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Vue d'ensemble</h2>
            <p className="text-sm text-slate-500 mb-6">Définissez les informations principales de votre service pour attirer les acheteurs.</p>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Titre de votre service <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Je vais créer votre logo professionnel"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 outline-none"
            />
            <p className="text-xs text-slate-500 mt-2">Soyez précis et accrocheur. C'est ce que vos clients verront en premier dans les résultats de recherche.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Catégorie principale</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 outline-none"
              >
                <option value="">Sélectionnez une catégorie</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Sous-catégorie</label>
              <select
                value={formData.sub_category}
                onChange={(e) => setFormData({...formData, sub_category: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 outline-none disabled:opacity-50"
                disabled={!formData.category_id}
              >
                <option value="">Sélectionnez une sous-catégorie</option>
                {availableSubCategories.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Mots-clés (Tags de recherche)</label>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-frilya-600/20 focus-within:border-frilya-600">
              {formData.search_tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-frilya-100 text-frilya-800 px-3 py-1 rounded-lg text-sm font-medium">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-frilya-900"><X className="w-3 h-3" /></button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={formData.search_tags.length < 5 ? "Ajouter un tag (Entrée ou virgule pour valider)" : "Limite de 5 tags atteinte"}
                disabled={formData.search_tags.length >= 5}
                className="flex-1 min-w-[200px] bg-transparent outline-none px-2 py-1 text-sm disabled:opacity-50"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">Maximum 5 tags. Les mots-clés aident les acheteurs à trouver votre service.</p>
          </div>
        </div>
      )}

      {/* ETAPE 2 : Tarification */}
      {currentStep === 2 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Formules de prix</h2>
              <p className="text-sm text-slate-500 mb-6">Proposez jusqu'à 3 niveaux de prestations pour s'adapter à tous les budgets.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {(['basic', 'standard', 'premium'] as const).map((type) => (
                <div key={type} className={`border rounded-2xl p-5 ${type === 'premium' ? 'border-frilya-200 bg-frilya-50/30' : 'border-slate-200 bg-slate-50'}`}>
                  <h3 className="font-bold text-lg capitalize mb-4 text-slate-900 border-b border-slate-200 pb-3">
                    {type === 'basic' ? 'Basique' : type === 'standard' ? 'Standard' : 'Premium'}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nom de la formule</label>
                      <input
                        type="text"
                        value={packages[type].name}
                        onChange={(e) => setPackages({...packages, [type]: {...packages[type], name: e.target.value}})}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-frilya-600"
                        placeholder={`Ex: Pack ${type}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Description courte</label>
                      <textarea
                        value={packages[type].description}
                        onChange={(e) => setPackages({...packages, [type]: {...packages[type], description: e.target.value}})}
                        rows={3}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-frilya-600 resize-none"
                        placeholder="Que contient cette formule ?"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Prix (€)</label>
                        <input
                          type="number"
                          min="5"
                          value={packages[type].price}
                          onChange={(e) => setPackages({...packages, [type]: {...packages[type], price: Number(e.target.value)}})}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-frilya-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Délai (Jours)</label>
                        <input
                          type="number"
                          min="1"
                          value={packages[type].delivery_days}
                          onChange={(e) => setPackages({...packages, [type]: {...packages[type], delivery_days: Number(e.target.value)}})}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-frilya-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Révisions incluses</label>
                      <input
                        type="number"
                        min="0"
                        value={packages[type].revisions_included}
                        onChange={(e) => setPackages({...packages, [type]: {...packages[type], revisions_included: Number(e.target.value)}})}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-frilya-600"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Extras (Options)</h2>
                <p className="text-sm text-slate-500">Proposez des services additionnels payants.</p>
              </div>
              <button onClick={addExtra} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl transition-colors text-sm">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>

            <div className="space-y-4">
              {extras.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">Aucune option supplémentaire proposée pour le moment.</p>
              ) : extras.map((extra, index) => (
                <div key={index} className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 relative group">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Titre de l'option</label>
                      <input
                        type="text"
                        value={extra.name}
                        onChange={(e) => {
                          const newExtras = [...extras];
                          newExtras[index].name = e.target.value;
                          setExtras(newExtras);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-frilya-600"
                        placeholder="Ex: Livraison Express"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Prix en plus (€)</label>
                      <input
                        type="number"
                        min="1"
                        value={extra.price_add}
                        onChange={(e) => {
                          const newExtras = [...extras];
                          newExtras[index].price_add = Number(e.target.value);
                          setExtras(newExtras);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-frilya-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Délai en plus (Jours)</label>
                      <input
                        type="number"
                        min="0"
                        value={extra.delivery_add_days}
                        onChange={(e) => {
                          const newExtras = [...extras];
                          newExtras[index].delivery_add_days = Number(e.target.value);
                          setExtras(newExtras);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-frilya-600"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => removeExtra(index, extra.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors absolute top-2 right-2 md:relative md:top-0 md:right-0 md:mt-5"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ETAPE 3 : Description et FAQ */}
      {currentStep === 3 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Description */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Description du service</h2>
              <p className="text-sm text-slate-500">Expliquez en détail ce que vous proposez, votre méthode de travail et pourquoi les clients devraient vous choisir.</p>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Description détaillée <span className="text-red-500">*</span></label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={12}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 outline-none resize-y"
                placeholder="Décrivez votre service ici..."
              />
              <p className="text-xs text-slate-500 mt-2">
                Soyez clair et transparent sur ce qui est inclus ou non. Utilisez des paragraphes pour aérer votre texte.
              </p>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Foire aux questions (FAQ)</h2>
                <p className="text-sm text-slate-500">Anticipez les questions de vos futurs clients.</p>
              </div>
              <button onClick={addFaq} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl transition-colors text-sm">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>

            <div className="space-y-4">
              {faqs.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">Aucune question ajoutée pour le moment.</p>
              ) : faqs.map((faq, index) => (
                <div key={index} className="flex flex-col md:flex-row gap-4 items-start bg-slate-50 p-4 rounded-2xl border border-slate-200 relative group">
                  <div className="flex-1 w-full space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Question</label>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => {
                          const newFaqs = [...faqs];
                          newFaqs[index].question = e.target.value;
                          setFaqs(newFaqs);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-frilya-600"
                        placeholder="Ex: De quoi avez-vous besoin pour commencer ?"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Réponse</label>
                      <textarea
                        value={faq.answer}
                        onChange={(e) => {
                          const newFaqs = [...faqs];
                          newFaqs[index].answer = e.target.value;
                          setFaqs(newFaqs);
                        }}
                        rows={3}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-frilya-600 resize-y"
                        placeholder="Ex: J'ai besoin de vos couleurs, de votre logo et d'un exemple de site que vous aimez."
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFaq(index, faq.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors absolute top-2 right-2 md:relative md:top-0 md:right-0 md:mt-5"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ETAPE 4 : Galerie Média */}
      {currentStep === 4 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Galerie de médias</h2>
              <p className="text-sm text-slate-500">Ajoutez des images ou une vidéo pour illustrer votre service. La première image sera la couverture de votre annonce.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Zone d'upload */}
              <div className="md:col-span-3">
                <label 
                  className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
                    uploadingMedia ? 'bg-slate-50 border-slate-300' : 'bg-slate-50 border-slate-300 hover:bg-frilya-50 hover:border-frilya-400'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {uploadingMedia ? (
                      <Loader2 className="w-10 h-10 text-frilya-500 animate-spin mb-3" />
                    ) : (
                      <UploadCloud className="w-10 h-10 text-slate-400 mb-3" />
                    )}
                    <p className="mb-2 text-sm text-slate-700 font-semibold">
                      {uploadingMedia ? "Upload en cours..." : "Cliquez pour ajouter un fichier"}
                    </p>
                    <p className="text-xs text-slate-500">PNG, JPG ou MP4 (Max 5Mo)</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/jpg, video/mp4"
                    onChange={handleMediaUpload}
                    disabled={uploadingMedia || media.length >= 6}
                  />
                </label>
                {media.length >= 6 && (
                  <p className="text-xs text-red-500 mt-2 text-center">Vous avez atteint la limite de 6 médias.</p>
                )}
              </div>

              {/* Liste des médias */}
              {media.map((item, index) => (
                <div key={index} className="relative group rounded-2xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                  {item.media_type === 'video' ? (
                    <video src={item.url} className="w-full h-full object-cover" controls />
                  ) : (
                    <img src={item.url} alt={`Media ${index + 1}`} className="w-full h-full object-cover" />
                  )}
                  
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                    {item.media_type === 'video' ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                    {index === 0 && " Couverture"}
                  </div>

                  <button
                    onClick={() => removeMedia(index, item.id, item.url)}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ETAPE 5 : Exigences */}
      {currentStep === 5 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Exigences requises</h2>
                <p className="text-sm text-slate-500">Dites à votre client ce dont vous avez besoin pour commencer à travailler.</p>
              </div>
              <button onClick={addRequirement} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl transition-colors text-sm">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>

            <div className="space-y-4">
              {requirements.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">Aucune exigence ajoutée. Le client pourra passer commande sans vous fournir d'informations préalables.</p>
              ) : requirements.map((req, index) => (
                <div key={index} className="flex flex-col gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 relative group">
                  <div className="flex-1 w-full space-y-4 md:pr-12">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Question pour le client</label>
                      <input
                        type="text"
                        value={req.question}
                        onChange={(e) => {
                          const newReqs = [...requirements];
                          newReqs[index].question = e.target.value;
                          setRequirements(newReqs);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-frilya-600"
                        placeholder="Ex: Veuillez me fournir le logo de votre entreprise en format PNG."
                      />
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Type de réponse attendue</label>
                        <select
                          value={req.response_type}
                          onChange={(e) => {
                            const newReqs = [...requirements];
                            newReqs[index].response_type = e.target.value;
                            setRequirements(newReqs);
                          }}
                          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-frilya-600"
                        >
                          <option value="text">Texte libre</option>
                          <option value="file">Fichier joint</option>
                          <option value="multiple_choice">Choix multiple</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-4">
                        <input
                          type="checkbox"
                          id={`req-required-${index}`}
                          checked={req.is_required}
                          onChange={(e) => {
                            const newReqs = [...requirements];
                            newReqs[index].is_required = e.target.checked;
                            setRequirements(newReqs);
                          }}
                          className="w-4 h-4 text-frilya-600 rounded focus:ring-frilya-600"
                        />
                        <label htmlFor={`req-required-${index}`} className="text-sm font-medium text-slate-700 cursor-pointer">
                          Réponse obligatoire
                        </label>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeRequirement(index, req.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors absolute top-2 right-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ETAPE 6 : Aperçu et Publication */}
      {currentStep === 6 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm text-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Votre service est prêt à être publié !</h2>
            <p className="text-slate-500 max-w-2xl mx-auto mb-8">
              Vous avez rempli toutes les informations nécessaires. Prenez un moment pour relire votre annonce. Une fois publiée, elle sera visible par tous les acheteurs de la plateforme.
            </p>

            <div className="bg-slate-50 rounded-2xl p-6 text-left max-w-2xl mx-auto border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-4">Récapitulatif</h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <span><strong>Titre :</strong> {formData.title || 'Non défini'}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <span><strong>Catégorie :</strong> {categories.find(c => c.id.toString() === formData.category_id)?.name || 'Non définie'}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <span><strong>Prix de départ :</strong> {packages.basic.price} €</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <span><strong>Médias :</strong> {media.length} fichier(s) ajouté(s)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <span><strong>Exigences :</strong> {requirements.length} question(s) pour l'acheteur</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Boutons de navigation bas */}
      <div className="flex justify-between items-center fixed bottom-0 left-0 right-0 md:left-64 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-4xl mx-auto w-full flex justify-between items-center px-4">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="px-6 py-3 font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-50 transition-colors"
          >
            Retour
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-sm"
          >
            {currentStep === 6 ? 'Publier l\'annonce' : 'Enregistrer & Continuer'}
          </button>
        </div>
      </div>

    </div>
  );
}