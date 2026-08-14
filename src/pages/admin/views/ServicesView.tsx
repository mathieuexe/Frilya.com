import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { notifySellerModeration, type ModerationAction } from '../../../lib/moderation';
import {
  Loader2, Search, Trash2, CheckCircle, Eye, EyeOff, Pencil, ExternalLink, X,
  AlertTriangle, Save, PauseCircle, Mail, MessageSquare, Package, Clock, Tag, Image as ImageIcon
} from 'lucide-react';

type StatusKey = 'draft' | 'active' | 'paused' | 'hidden' | 'banned';

const STATUS_META: Record<StatusKey, { label: string; className: string }> = {
  active: { label: 'Actif', className: 'bg-emerald-100 text-emerald-700' },
  draft: { label: 'Brouillon', className: 'bg-slate-100 text-slate-700' },
  paused: { label: 'En pause', className: 'bg-amber-100 text-amber-700' },
  hidden: { label: 'Masqué', className: 'bg-orange-100 text-orange-700' },
  banned: { label: 'Suspendu', className: 'bg-red-100 text-red-700' }
};

const statusBadge = (status: string) => {
  const meta = STATUS_META[status as StatusKey];
  return (
    <span className={`px-2.5 py-1 text-xs font-bold rounded-full whitespace-nowrap ${meta?.className || 'bg-slate-100 text-slate-700'}`}>
      {meta?.label || status}
    </span>
  );
};

export default function ServicesView() {
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StatusKey>('all');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  // Panneau latéral
  const [selected, setSelected] = useState<any>(null);
  const [tab, setTab] = useState<'overview' | 'edit'>('overview');
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Édition
  const [form, setForm] = useState<any>(null);
  const [packagesForm, setPackagesForm] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Modération
  const [modal, setModal] = useState<{ action: ModerationAction; service: any } | null>(null);
  const [reason, setReason] = useState('');
  const [notifySeller, setNotifySeller] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchServices();
    fetchCategories();
    supabase.auth.getSession().then(({ data }) => setCurrentUser(data.session?.user || null));
  }, [statusFilter]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('id, name').order('name');
    if (data) setCategories(data);
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      let query = supabase.from('services').select('*, profiles (id, full_name, email, slug)');
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Erreur:', error);
      setToast({ tone: 'error', message: 'Impossible de charger les services.' });
    } finally {
      setLoading(false);
    }
  };

  const openDrawer = async (service: any, initialTab: 'overview' | 'edit' = 'overview') => {
    setSelected(service);
    setTab(initialTab);
    setDetailLoading(true);
    setForm({
      title: service.title || '',
      description: service.description || '',
      category_id: service.category_id?.toString() || '',
      sub_category: service.sub_category || '',
      price_basic: service.price_basic ?? 0,
      delivery_time_days: service.delivery_time_days ?? 1,
      status: service.status || 'draft',
      search_tags: (service.search_tags || []).join(', '),
      cover_image_url: service.cover_image_url || ''
    });

    try {
      const [pkgs, media, extras, faqs, requirements, orders] = await Promise.all([
        supabase.from('service_packages').select('*').eq('service_id', service.id),
        supabase.from('service_media').select('*').eq('service_id', service.id).order('position'),
        supabase.from('service_extras').select('*').eq('service_id', service.id),
        supabase.from('service_faqs').select('*').eq('service_id', service.id),
        supabase.from('service_requirements').select('*').eq('service_id', service.id),
        supabase.from('orders').select('id, status, amount').eq('service_id', service.id)
      ]);

      const rank: Record<string, number> = { basic: 0, standard: 1, premium: 2 };
      const sortedPkgs = [...(pkgs.data || [])].sort(
        (a, b) => (rank[a.package_type] ?? 99) - (rank[b.package_type] ?? 99) || (a.price || 0) - (b.price || 0)
      );

      setDetail({
        packages: sortedPkgs,
        media: media.data || [],
        extras: extras.data || [],
        faqs: faqs.data || [],
        requirements: requirements.data || [],
        orders: orders.data || []
      });
      setPackagesForm(sortedPkgs.map(p => ({ ...p })));
    } catch (err) {
      console.error('Erreur chargement du détail du service :', err);
      setToast({ tone: 'error', message: 'Impossible de charger le détail du service.' });
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDrawer = () => {
    setSelected(null);
    setDetail(null);
    setForm(null);
    setPackagesForm([]);
  };

  /** Un UPDATE bloqué par RLS ne renvoie pas d'erreur : il faut vérifier les lignes touchées. */
  const updateService = async (id: string, patch: Record<string, any>) => {
    const { data, error } = await supabase.from('services').update(patch).eq('id', id).select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error(
        "aucune ligne modifiée — exécutez la migration admin_service_moderation.sql pour donner les droits de modération à l'administration"
      );
    }
  };

  const applyStatus = async (service: any, status: StatusKey) => {
    try {
      await updateService(service.id, { status, updated_at: new Date().toISOString() });
      setServices(prev => prev.map(s => (s.id === service.id ? { ...s, status } : s)));
      if (selected?.id === service.id) setSelected({ ...selected, status });
      setToast({ tone: 'success', message: `Service « ${service.title} » : statut mis à jour (${STATUS_META[status].label}).` });
    } catch (err: any) {
      setToast({ tone: 'error', message: `Statut non modifié : ${err.message}` });
    }
  };

  const handleSaveEdit = async () => {
    if (!selected || !form) return;
    if (!form.title.trim()) {
      setToast({ tone: 'error', message: 'Le titre est obligatoire.' });
      return;
    }
    setSaving(true);
    try {
      const patch = {
        title: form.title.trim(),
        description: form.description,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        sub_category: form.sub_category || null,
        price_basic: Number(form.price_basic) || 0,
        delivery_time_days: Number(form.delivery_time_days) || 1,
        status: form.status,
        search_tags: form.search_tags
          ? form.search_tags.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
          : [],
        cover_image_url: form.cover_image_url || null,
        updated_at: new Date().toISOString()
      };

      await updateService(selected.id, patch);

      // Forfaits modifiés
      for (const pkg of packagesForm) {
        const original = detail?.packages.find((p: any) => p.id === pkg.id);
        const changed = original && (
          original.name !== pkg.name ||
          original.description !== pkg.description ||
          Number(original.price) !== Number(pkg.price) ||
          Number(original.delivery_days) !== Number(pkg.delivery_days) ||
          Number(original.revisions_included) !== Number(pkg.revisions_included)
        );
        if (!changed) continue;

        const { error } = await supabase
          .from('service_packages')
          .update({
            name: pkg.name,
            description: pkg.description,
            price: Number(pkg.price) || 0,
            delivery_days: Number(pkg.delivery_days) || 1,
            revisions_included: Number(pkg.revisions_included) || 0
          })
          .eq('id', pkg.id);
        if (error) throw error;
      }

      setServices(prev => prev.map(s => (s.id === selected.id ? { ...s, ...patch } : s)));
      setSelected({ ...selected, ...patch });
      setDetail((prev: any) => (prev ? { ...prev, packages: packagesForm.map(p => ({ ...p })) } : prev));
      setToast({ tone: 'success', message: 'Service mis à jour.' });
      setTab('overview');
    } catch (err: any) {
      console.error(err);
      setToast({ tone: 'error', message: `Enregistrement impossible : ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const openModeration = (action: ModerationAction, service: any) => {
    setModal({ action, service });
    setReason('');
    setNotifySeller(true);
  };

  const runModeration = async () => {
    if (!modal) return;
    const { action, service } = modal;

    if ((action === 'hidden' || action === 'deleted') && !reason.trim() && notifySeller) {
      setToast({ tone: 'error', message: 'Le motif est obligatoire pour prévenir le vendeur.' });
      return;
    }

    setProcessing(true);
    try {
      if (action === 'hidden') {
        await updateService(service.id, {
          status: 'hidden',
          moderation_reason: reason.trim(),
          moderated_at: new Date().toISOString(),
          moderated_by: currentUser?.id || null,
          updated_at: new Date().toISOString()
        });
        setServices(prev => prev.map(s => (s.id === service.id
          ? { ...s, status: 'hidden', moderation_reason: reason.trim(), moderated_at: new Date().toISOString() }
          : s)));
        if (selected?.id === service.id) {
          setSelected({ ...selected, status: 'hidden', moderation_reason: reason.trim() });
        }
      } else if (action === 'restored') {
        await updateService(service.id, {
          status: 'active',
          moderation_reason: null,
          moderated_at: new Date().toISOString(),
          moderated_by: currentUser?.id || null,
          updated_at: new Date().toISOString()
        });
        setServices(prev => prev.map(s => (s.id === service.id
          ? { ...s, status: 'active', moderation_reason: null }
          : s)));
        if (selected?.id === service.id) setSelected({ ...selected, status: 'active', moderation_reason: null });
      } else {
        const { data, error } = await supabase.from('services').delete().eq('id', service.id).select('id');
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error(
            "aucune ligne supprimée — exécutez la migration admin_service_moderation.sql pour donner les droits de modération à l'administration"
          );
        }
        setServices(prev => prev.filter(s => s.id !== service.id));
        if (selected?.id === service.id) closeDrawer();
      }

      // Notification du vendeur (message privé Support Frilya + e-mail)
      let notice = '';
      if (notifySeller && service.seller_id) {
        const res = await notifySellerModeration({
          sellerId: service.seller_id,
          sellerEmail: service.profiles?.email,
          sellerName: service.profiles?.full_name,
          serviceTitle: service.title,
          action,
          reason: reason.trim()
        });
        notice = ` Message privé : ${res.messageSent ? 'envoyé' : 'échec'} · E-mail : ${res.emailSent ? 'envoyé' : 'échec'}.`;
        if (res.errors.length > 0) notice += ` (${res.errors.join(' — ')})`;
      }

      const actionLabel = action === 'hidden' ? 'masqué' : action === 'restored' ? 'réactivé' : 'supprimé';
      setToast({
        tone: notifySeller && notice.includes('échec') ? 'error' : 'success',
        message: `Service « ${service.title} » ${actionLabel}.${notice}`
      });
      setModal(null);
    } catch (err: any) {
      console.error(err);
      setToast({ tone: 'error', message: `Action impossible : ${err.message}` });
    } finally {
      setProcessing(false);
    }
  };

  const filteredServices = services.filter(s =>
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.profiles?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const counters = {
    total: services.length,
    active: services.filter(s => s.status === 'active').length,
    hidden: services.filter(s => s.status === 'hidden').length,
    draft: services.filter(s => s.status === 'draft').length
  };

  const categoryName = (id: any) => categories.find(c => c.id?.toString() === id?.toString())?.name;

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`rounded-2xl px-4 py-3 border flex items-start gap-3 text-sm ${
          toast.tone === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.tone === 'success' ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
          <p className="flex-1">{toast.message}</p>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-white/50 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Compteurs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Services', value: counters.total, className: 'text-slate-900' },
          { label: 'Actifs', value: counters.active, className: 'text-emerald-600' },
          { label: 'Masqués', value: counters.hidden, className: 'text-orange-600' },
          { label: 'Brouillons', value: counters.draft, className: 'text-slate-500' }
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.className}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Gestion et modération des services</h2>
            <p className="text-sm text-slate-500">Consultez, modifiez, masquez ou supprimez n'importe quelle annonce.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="hidden">Masqués</option>
              <option value="draft">Brouillons</option>
              <option value="paused">En pause</option>
              <option value="banned">Suspendus</option>
            </select>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Titre, vendeur, e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Service</th>
                <th className="p-4 font-semibold">Vendeur</th>
                <th className="p-4 font-semibold">Catégorie</th>
                <th className="p-4 font-semibold">Prix</th>
                <th className="p-4 font-semibold">Statut</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-frilya-600" /></td></tr>
              ) : filteredServices.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Aucun service trouvé.</td></tr>
              ) : (
                filteredServices.map((service) => (
                  <tr
                    key={service.id}
                    className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${selected?.id === service.id ? 'bg-frilya-50/60' : ''}`}
                    onClick={() => openDrawer(service)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                          {service.cover_image_url ? (
                            <img src={service.cover_image_url} alt={service.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-slate-300" /></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 line-clamp-1">{service.title || 'Sans titre'}</div>
                          <div className="text-xs text-slate-500">{new Date(service.created_at).toLocaleDateString('fr-FR')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      <div className="text-slate-700 font-medium">{service.profiles?.full_name || 'Inconnu'}</div>
                      <div className="text-xs text-slate-400">{service.profiles?.email}</div>
                    </td>
                    <td className="p-4 text-slate-600 text-sm">{categoryName(service.category_id) || service.sub_category || '—'}</td>
                    <td className="p-4 font-bold text-frilya-600 whitespace-nowrap">{service.price_basic} €</td>
                    <td className="p-4">
                      {statusBadge(service.status)}
                      {service.status === 'hidden' && service.moderation_reason && (
                        <p className="text-[11px] text-orange-600 mt-1 max-w-[200px] line-clamp-2" title={service.moderation_reason}>
                          {service.moderation_reason}
                        </p>
                      )}
                    </td>
                    <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openDrawer(service, 'overview')}
                          className="p-2 text-slate-400 hover:text-frilya-600 hover:bg-frilya-50 rounded-lg transition-colors" title="Voir la fiche complète"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDrawer(service, 'edit')}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {service.status === 'hidden' ? (
                          <button
                            onClick={() => openModeration('restored', service)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Réafficher le service"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => openModeration('hidden', service)}
                            className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Masquer (modération)"
                          >
                            <EyeOff className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openModeration('deleted', service)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {service.status === 'active' && (
                          <a
                            href={`/service/${service.slug || service.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Voir sur le site"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Panneau latéral : fiche complète + édition */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40" onClick={closeDrawer} />
          <div className="relative bg-slate-50 w-full max-w-3xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">

            <div className="bg-white border-b border-slate-200 p-5 shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {statusBadge(selected.status)}
                    <span className="text-xs text-slate-400 font-mono">{selected.slug || selected.id}</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 truncate">{selected.title}</h2>
                  <p className="text-sm text-slate-500">
                    Par {selected.profiles?.full_name || 'Inconnu'} · {selected.profiles?.email || 'e-mail inconnu'}
                  </p>
                </div>
                <button onClick={closeDrawer} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => setTab('overview')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'overview' ? 'bg-frilya-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Fiche complète
                </button>
                <button
                  onClick={() => setTab('edit')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'edit' ? 'bg-frilya-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Édition
                </button>

                <div className="flex-1" />

                {selected.status === 'hidden' ? (
                  <button
                    onClick={() => openModeration('restored', selected)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                  >
                    <CheckCircle className="w-4 h-4" /> Réafficher
                  </button>
                ) : (
                  <button
                    onClick={() => openModeration('hidden', selected)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100"
                  >
                    <EyeOff className="w-4 h-4" /> Masquer
                  </button>
                )}
                <button
                  onClick={() => openModeration('deleted', selected)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4" /> Supprimer
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
              {selected.status === 'hidden' && selected.moderation_reason && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
                  <EyeOff className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-900">
                    <p className="font-bold">Masqué par la modération</p>
                    <p className="mt-1">{selected.moderation_reason}</p>
                    {selected.moderated_at && (
                      <p className="text-xs text-orange-700 mt-1">Le {new Date(selected.moderated_at).toLocaleString('fr-FR')}</p>
                    )}
                  </div>
                </div>
              )}

              {detailLoading ? (
                <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-frilya-600" /></div>
              ) : tab === 'overview' ? (
                <>
                  {/* Aperçu média */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="aspect-video bg-slate-100">
                      {(detail?.media?.[0]?.url || selected.cover_image_url) ? (
                        <img src={detail?.media?.[0]?.url || selected.cover_image_url} alt={selected.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Aucun visuel</div>
                      )}
                    </div>
                    {detail?.media?.length > 1 && (
                      <div className="p-3 flex gap-2 overflow-x-auto">
                        {detail.media.slice(1).map((m: any) => (
                          <img key={m.id} src={m.url} alt="" className="w-20 h-14 object-cover rounded-lg border border-slate-200 shrink-0" />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Métadonnées */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Catégorie</p>
                      <p className="text-slate-800 font-medium">{categoryName(selected.category_id) || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Sous-catégorie</p>
                      <p className="text-slate-800 font-medium">{selected.sub_category || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Prix de base</p>
                      <p className="text-slate-800 font-medium">{selected.price_basic} €</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Délai</p>
                      <p className="text-slate-800 font-medium">{selected.delivery_time_days} jour(s)</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Commandes</p>
                      <p className="text-slate-800 font-medium">{detail?.orders?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Créé le</p>
                      <p className="text-slate-800 font-medium">{new Date(selected.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>

                  {selected.search_tags?.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><Tag className="w-3 h-3" /> Mots-clés</p>
                      <div className="flex flex-wrap gap-2">
                        {selected.search_tags.map((t: string) => (
                          <span key={t} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase mb-2">Description</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.description || '—'}</p>
                  </div>

                  {/* Forfaits */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-1"><Package className="w-3 h-3" /> Tarification</p>
                    {detail?.packages?.length ? (
                      <div className="space-y-2">
                        {detail.packages.map((p: any) => (
                          <div key={p.id} className="flex items-start justify-between gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-sm">{p.name || p.package_type}</p>
                              {p.description && <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>}
                              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                <Clock className="w-3 h-3" /> {p.delivery_days} j · {p.revisions_included || 0} révision(s)
                              </p>
                            </div>
                            <p className="font-bold text-frilya-600 whitespace-nowrap">{p.price} €</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">
                        Aucun forfait enregistré — la fiche affiche le prix de base ({selected.price_basic} €) comme tarif unique.
                      </p>
                    )}
                  </div>

                  {detail?.extras?.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase mb-3">Options payantes</p>
                      <div className="space-y-2">
                        {detail.extras.map((e: any) => (
                          <div key={e.id} className="flex justify-between text-sm p-3 bg-slate-50 rounded-xl">
                            <span className="text-slate-700">{e.name}</span>
                            <span className="font-bold text-slate-900">+{e.price_add} €</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detail?.faqs?.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase mb-3">FAQ de l'annonce</p>
                      <div className="space-y-3">
                        {detail.faqs.map((f: any) => (
                          <div key={f.id}>
                            <p className="text-sm font-bold text-slate-800">{f.question}</p>
                            <p className="text-sm text-slate-600">{f.answer}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detail?.requirements?.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase mb-3">Exigences acheteur</p>
                      <ul className="space-y-1 text-sm text-slate-700 list-disc pl-5">
                        {detail.requirements.map((r: any) => (
                          <li key={r.id}>{r.question} {r.is_required ? '' : '(facultatif)'}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                /* ---------- ÉDITION ---------- */
                <>
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Titre</label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-frilya-600"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Catégorie</label>
                        <select
                          value={form.category_id}
                          onChange={e => setForm({ ...form, category_id: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-frilya-600 bg-white"
                        >
                          <option value="">Non définie</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Sous-catégorie</label>
                        <input
                          type="text"
                          value={form.sub_category}
                          onChange={e => setForm({ ...form, sub_category: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-frilya-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                      <textarea
                        rows={7}
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-frilya-600 resize-y"
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Prix de base (€)</label>
                        <input
                          type="number"
                          min="0"
                          value={form.price_basic}
                          onChange={e => setForm({ ...form, price_basic: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-frilya-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Délai (jours)</label>
                        <input
                          type="number"
                          min="1"
                          value={form.delivery_time_days}
                          onChange={e => setForm({ ...form, delivery_time_days: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-frilya-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Statut</label>
                        <select
                          value={form.status}
                          onChange={e => setForm({ ...form, status: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-frilya-600 bg-white"
                        >
                          <option value="draft">Brouillon</option>
                          <option value="active">Actif</option>
                          <option value="paused">En pause</option>
                          <option value="hidden">Masqué</option>
                          <option value="banned">Suspendu</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Mots-clés (séparés par des virgules)</label>
                      <input
                        type="text"
                        value={form.search_tags}
                        onChange={e => setForm({ ...form, search_tags: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-frilya-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Image de couverture (URL)</label>
                      <input
                        type="text"
                        value={form.cover_image_url}
                        onChange={e => setForm({ ...form, cover_image_url: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-frilya-600"
                      />
                    </div>

                    <p className="text-xs text-slate-400">
                      Changer le statut en « Masqué » depuis ce formulaire ne prévient pas le vendeur.
                      Utilisez le bouton « Masquer » en haut pour saisir un motif et déclencher la notification.
                    </p>
                  </div>

                  {packagesForm.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                      <p className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Package className="w-3 h-3" /> Forfaits ({packagesForm.length})
                      </p>
                      {packagesForm.map((pkg, index) => (
                        <div key={pkg.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-slate-500">{pkg.package_type}</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="col-span-2">
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Nom</label>
                              <input
                                type="text"
                                value={pkg.name || ''}
                                onChange={e => setPackagesForm(prev => prev.map((p, i) => i === index ? { ...p, name: e.target.value } : p))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-frilya-600 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Prix (€)</label>
                              <input
                                type="number"
                                min="0"
                                value={pkg.price ?? 0}
                                onChange={e => setPackagesForm(prev => prev.map((p, i) => i === index ? { ...p, price: e.target.value } : p))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-frilya-600 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Délai (j)</label>
                              <input
                                type="number"
                                min="1"
                                value={pkg.delivery_days ?? 1}
                                onChange={e => setPackagesForm(prev => prev.map((p, i) => i === index ? { ...p, delivery_days: e.target.value } : p))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-frilya-600 bg-white"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="md:col-span-3">
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label>
                              <input
                                type="text"
                                value={pkg.description || ''}
                                onChange={e => setPackagesForm(prev => prev.map((p, i) => i === index ? { ...p, description: e.target.value } : p))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-frilya-600 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Révisions</label>
                              <input
                                type="number"
                                min="0"
                                value={pkg.revisions_included ?? 0}
                                onChange={e => setPackagesForm(prev => prev.map((p, i) => i === index ? { ...p, revisions_included: e.target.value } : p))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-frilya-600 bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {tab === 'edit' && (
              <div className="bg-white border-t border-slate-200 p-4 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-2">
                  {selected.status !== 'active' && (
                    <button
                      onClick={() => applyStatus(selected, 'active')}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                    >
                      <CheckCircle className="w-4 h-4" /> Activer
                    </button>
                  )}
                  {selected.status !== 'paused' && (
                    <button
                      onClick={() => applyStatus(selected, 'paused')}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    >
                      <PauseCircle className="w-4 h-4" /> Mettre en pause
                    </button>
                  )}
                </div>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-frilya-900 text-white text-sm font-bold hover:bg-frilya-800 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer les modifications
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modale de modération */}
      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => !processing && setModal(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className={`p-5 border-b ${
              modal.action === 'deleted' ? 'bg-red-50 border-red-100'
              : modal.action === 'hidden' ? 'bg-orange-50 border-orange-100'
              : 'bg-emerald-50 border-emerald-100'
            }`}>
              <h3 className="text-lg font-bold text-slate-900">
                {modal.action === 'hidden' ? 'Masquer le service' : modal.action === 'deleted' ? 'Supprimer le service' : 'Réafficher le service'}
              </h3>
              <p className="text-sm text-slate-600 mt-1 truncate">{modal.service.title}</p>
            </div>

            <div className="p-5 space-y-4">
              {modal.action === 'hidden' && (
                <p className="text-sm text-slate-600">
                  Le service disparaîtra immédiatement du site. Le vendeur sera prévenu du masquage et du motif saisi ci-dessous.
                </p>
              )}
              {modal.action === 'deleted' && (
                <p className="text-sm text-red-600 font-medium">
                  Cette action est définitive : l'annonce, ses forfaits, ses médias et sa FAQ seront supprimés.
                </p>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {modal.action === 'restored' ? 'Message au vendeur (facultatif)' : 'Motif communiqué au vendeur'}
                  {modal.action !== 'restored' && notifySeller && <span className="text-red-500"> *</span>}
                </label>
                <textarea
                  rows={4}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={
                    modal.action === 'hidden'
                      ? "Ex : la description contient des coordonnées personnelles, ce qui est interdit par nos conditions d'utilisation."
                      : modal.action === 'deleted'
                        ? 'Ex : annonce frauduleuse, en violation de nos conditions générales.'
                        : 'Ex : votre annonce est conforme, merci pour votre correction.'
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-frilya-600 resize-none"
                />
              </div>

              <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifySeller}
                  onChange={e => setNotifySeller(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-frilya-600"
                />
                <span className="text-sm">
                  <span className="font-bold text-slate-800 block">Prévenir le vendeur</span>
                  <span className="text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs">
                    <span className="inline-flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Message privé de Support Frilya</span>
                    <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> E-mail à {modal.service.profiles?.email || 'adresse inconnue'}</span>
                  </span>
                </span>
              </label>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setModal(null)}
                disabled={processing}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={runModeration}
                disabled={processing}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 ${
                  modal.action === 'deleted' ? 'bg-red-600 hover:bg-red-500'
                  : modal.action === 'hidden' ? 'bg-orange-600 hover:bg-orange-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : modal.action === 'deleted' ? <Trash2 className="w-4 h-4" /> : modal.action === 'hidden' ? <EyeOff className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                {modal.action === 'hidden' ? 'Masquer et prévenir' : modal.action === 'deleted' ? 'Supprimer définitivement' : 'Réafficher et prévenir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
