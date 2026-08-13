import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, Upload, CheckCircle2, Loader2, Store, ShoppingBag } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export default function ReportIssue() {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  
  // States
  const [userType, setUserType] = useState<'vendeur' | 'acheteur' | null>(null);
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [referenceLink, setReferenceLink] = useState(searchParams.get('ref') || '');
  const [email, setEmail] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  
  // Dynamic Category States
  const [subData, setSubData] = useState<any>({});
  const [userServices, setUserServices] = useState<any[]>([]);

  // Loading & Success
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTicketId, setSuccessTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setEmail(session.user.email || '');
        
        // Fetch services if user is logged in
        const { data: services } = await supabase
          .from('services')
          .select('id, title')
          .eq('seller_id', session.user.id)
          .eq('status', 'active');
          
        if (services) {
          setUserServices(services);
        }
      }
    };
    checkUser();
  }, []);

  const handleSubDataChange = (key: string, value: string) => {
    setSubData({ ...subData, [key]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const generateTicketNumber = () => {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    let prefix = 'SNL'; // Défaut (Signalement)
    
    switch (category) {
      case 'renseignement': prefix = 'REQ'; break; // Requête/Question
      case 'annonce': prefix = 'ANN'; break;
      case 'user': prefix = 'USR'; break;
      case 'security': prefix = 'SEC'; break;
      case 'payment': prefix = 'PAY'; break;
      case 'bug': prefix = 'BUG'; break;
      default: prefix = 'SNL'; break;
    }
    
    return `${prefix}-${randomDigits}`;
  };

  const uploadFiles = async () => {
    const urls: string[] = [];
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('ticket_attachments')
        .upload(fileName, file);

      if (!error && data) {
        const { data: urlData } = supabase.storage.from('ticket_attachments').getPublicUrl(fileName);
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !title || description.length < 20 || (!email && !isAnonymous)) {
      setError("Veuillez remplir tous les champs obligatoires (la description doit faire au moins 20 caractères).");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const ticketNumber = generateTicketNumber();
      const uploadedUrls = files.length > 0 ? await uploadFiles() : [];

      const { error: insertError } = await supabase
        .from('report_tickets')
        .insert([{
          ticket_number: ticketNumber,
          reporter_id: user ? user.id : null,
          email: email,
          is_anonymous: isAnonymous,
          category,
          sub_data: subData,
          title,
          description,
          incident_date: incidentDate || null,
          attachments: uploadedUrls,
          reference_link: referenceLink
        }]);

      if (insertError) throw insertError;

      setSuccessTicketId(ticketNumber);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue lors de l'envoi de votre signalement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSuccessContent = () => {
    if (category === 'renseignement') {
      return {
        title: "Demande envoyée",
        message: "Merci pour votre message. Notre équipe va l'étudier et vous répondre dans les plus brefs délais."
      };
    }
    if (category === 'bug') {
      return {
        title: "Rapport de bug envoyé",
        message: "Merci pour votre aide ! Notre équipe technique a bien reçu votre rapport et va l'analyser."
      };
    }
    return {
      title: "Signalement envoyé",
      message: "Merci pour votre retour. Notre équipe a bien reçu votre signalement et va le traiter dans les plus brefs délais."
    };
  };

  if (successTicketId) {
    const successContent = getSuccessContent();

    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">{successContent.title}</h2>
          <p className="text-slate-600 mb-6">
            {successContent.message}
          </p>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-8">
            <p className="text-sm text-slate-500 mb-1">Votre numéro de suivi :</p>
            <p className="font-mono font-bold text-lg text-slate-900">{successTicketId}</p>
          </div>
          <Link to="/" className="text-frilya-600 font-bold hover:text-frilya-700 transition-colors">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-frilya-100 text-frilya-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Support & Signalement</h1>
          <p className="mt-2 text-slate-600">
            Aidez-nous à maintenir un environnement sûr ou posez-nous vos questions.
          </p>
        </div>

        {!userType ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <button
              type="button"
              onClick={() => setUserType('vendeur')}
              className="p-8 bg-white border-2 border-slate-200 rounded-3xl hover:border-frilya-600 hover:shadow-md transition-all group text-left"
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 group-hover:bg-frilya-600 group-hover:text-white transition-colors">
                <Store className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Je suis vendeur</h3>
              <p className="text-slate-600 text-sm">J'ai un problème avec un client, une de mes annonces, ou une question sur mes ventes.</p>
            </button>

            <button
              type="button"
              onClick={() => setUserType('acheteur')}
              className="p-8 bg-white border-2 border-slate-200 rounded-3xl hover:border-frilya-600 hover:shadow-md transition-all group text-left"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 group-hover:bg-frilya-600 group-hover:text-white transition-colors">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Je suis acheteur</h3>
              <p className="text-slate-600 text-sm">J'ai un problème avec une commande, un vendeur, ou une question générale.</p>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
            <button 
              type="button" 
              onClick={() => { setUserType(null); setCategory(''); }} 
              className="text-sm font-bold text-frilya-600 mb-6 flex items-center gap-2 hover:underline"
            >
              &larr; Retour
            </button>

            {error && (
              <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">
                {error}
              </div>
            )}

            {/* 1. Catégorie */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-900 mb-3">
                Objet de la demande <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSubData({});
                }}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-frilya-600"
              >
                <option value="">Sélectionnez une catégorie...</option>
                {userType === 'vendeur' ? (
                  <>
                    <option value="user">Problème avec un acheteur (Signalement)</option>
                    <option value="annonce">Problème avec une de mes annonces</option>
                    <option value="payment">Paiement / Facturation</option>
                    <option value="renseignement">Demande de renseignement / Question technique</option>
                    <option value="bug">Bug technique</option>
                    <option value="other">Autre</option>
                  </>
                ) : (
                  <>
                    <option value="user">Problème avec un vendeur / service (Signalement)</option>
                    <option value="payment">Problème de paiement / Remboursement</option>
                    <option value="renseignement">Demande de renseignement / Question</option>
                    <option value="security">Problème de sécurité</option>
                    <option value="bug">Bug technique</option>
                    <option value="other">Autre</option>
                  </>
                )}
              </select>
            </div>

          {/* 2. Champs spécifiques dynamiques */}
          {category === 'annonce' && (
            <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
              {userType === 'vendeur' && userServices.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Service concerné</label>
                  <select 
                    onChange={(e) => handleSubDataChange('service_id', e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200"
                  >
                    <option value="">Sélectionnez un service...</option>
                    {userServices.map(service => (
                      <option key={service.id} value={service.id}>{service.title}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Type de problème</label>
                <select 
                  onChange={(e) => handleSubDataChange('type', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                >
                  <option value="">Sélectionnez...</option>
                  <option value="inapproprie">Contenu inapproprié</option>
                  <option value="prix">Prix anormal</option>
                  <option value="spam">Spam / Doublon</option>
                  <option value="plagiat">Plagiat</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>
          )}

          {category === 'user' && (
            <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Pseudo / ID de l'utilisateur concerné</label>
                <input 
                  type="text" 
                  onChange={(e) => handleSubDataChange('user_pseudo', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nature du problème</label>
                <select 
                  onChange={(e) => handleSubDataChange('nature', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                >
                  <option value="">Sélectionnez...</option>
                  <option value="arnaque">Arnaque suspectée</option>
                  <option value="injures">Propos injurieux / Harcèlement</option>
                  <option value="non_respect">Non-respect du contrat</option>
                  <option value="faux_profil">Faux profil</option>
                  <option value="hors_plateforme">Sollicitation hors plateforme</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="has_transaction"
                  onChange={(e) => handleSubDataChange('has_transaction', e.target.checked ? 'oui' : 'non')}
                  className="w-4 h-4 text-frilya-600 rounded border-slate-300"
                />
                <label htmlFor="has_transaction" className="text-sm font-medium text-slate-700">J'ai eu une transaction avec cette personne</label>
              </div>
            </div>
          )}

          {category === 'security' && (
            <div className="mb-8 p-6 bg-red-50 rounded-2xl border border-red-100 space-y-4">
              <p className="text-xs text-red-600 font-bold uppercase mb-2">Canal prioritaire de sécurité</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Type de faille</label>
                <select 
                  onChange={(e) => handleSubDataChange('type', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                >
                  <option value="">Sélectionnez...</option>
                  <option value="faille_tech">Faille technique</option>
                  <option value="compte_compromis">Compte compromis</option>
                  <option value="phishing">Phishing</option>
                  <option value="fuite_donnees">Fuite de données</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Niveau de gravité perçu</label>
                <select 
                  onChange={(e) => handleSubDataChange('severity', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                >
                  <option value="faible">Faible</option>
                  <option value="moyen">Moyen</option>
                  <option value="critique">Critique</option>
                </select>
              </div>
            </div>
          )}

          {category === 'payment' && (
            <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Référence de la transaction (si applicable)</label>
                <input 
                  type="text" 
                  onChange={(e) => handleSubDataChange('transaction_ref', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Montant concerné (€)</label>
                <input 
                  type="number" 
                  onChange={(e) => handleSubDataChange('amount', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                />
              </div>
            </div>
          )}

          {category === 'bug' && (
            <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Navigateur / Appareil utilisé</label>
                <input 
                  type="text" 
                  placeholder="Ex: Chrome sur Windows 10, ou Safari sur iPhone"
                  onChange={(e) => handleSubDataChange('browser', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Étapes pour reproduire le bug</label>
                <textarea 
                  rows={3}
                  onChange={(e) => handleSubDataChange('steps', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 resize-none"
                />
              </div>
            </div>
          )}

          {/* 3. Champs communs */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Sujet de votre demande <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Question sur la facturation, ou problème avec un utilisateur"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-frilya-600"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Description détaillée <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Veuillez décrire votre demande ou problème avec le plus de détails possible..."
                required
                minLength={20}
                rows={6}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-frilya-600 resize-none"
              />
              <p className="text-xs text-slate-500 mt-2">Minimum 20 caractères.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Date de l'incident (optionnel)</label>
                <input
                  type="datetime-local"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-frilya-600"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Lien / Référence (optionnel)</label>
                <input
                  type="url"
                  value={referenceLink}
                  onChange={(e) => setReferenceLink(e.target.value)}
                  placeholder="https://frilya.com/..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-frilya-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Pièces jointes (captures d'écran...)</label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept="image/*,.pdf,.doc,.docx"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center">
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-sm font-medium text-frilya-600">Cliquez pour ajouter des fichiers</span>
                  <span className="text-xs text-slate-500 mt-1">Images, PDF ou Word (max 5Mo)</span>
                </label>
              </div>
              {files.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> {f.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-200 pt-6">
              <label className="block text-sm font-bold text-slate-900 mb-2">Votre Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isAnonymous}
                placeholder="Pour vous recontacter..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-frilya-600 disabled:bg-slate-100 disabled:text-slate-400"
              />
              
              <div className="mt-4 flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="anonymous"
                  checked={isAnonymous}
                  onChange={(e) => {
                    setIsAnonymous(e.target.checked);
                    if (e.target.checked) setEmail('');
                    else if (user) setEmail(user.email || '');
                  }}
                  className="w-5 h-5 text-frilya-600 rounded border-slate-300 focus:ring-frilya-600"
                />
                <label htmlFor="anonymous" className="text-sm font-medium text-slate-700">
                  Je souhaite faire ce signalement de manière anonyme. <br/>
                  <span className="text-xs text-slate-500 font-normal">Attention : nous ne pourrons pas vous tenir informé de la suite donnée à ce signalement.</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-frilya-900 hover:bg-frilya-800 text-white font-bold py-4 px-8 rounded-xl transition-colors mt-8 flex justify-center items-center gap-2 disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Envoi en cours...
                </>
              ) : (
                'Envoyer le signalement'
              )}
            </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}