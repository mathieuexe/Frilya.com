import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Loader2, Plus, Edit2, Trash2, Save, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface FaqCategory {
  id: string;
  name: string;
}

interface FaqArticle {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  content: string;
  tags: string[];
  views_count: number;
  status: 'draft' | 'published';
  order: number;
}

export default function FaqArticlesView() {
  const [articles, setArticles] = useState<FaqArticle[]>([]);
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FaqArticle>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [catRes, artRes] = await Promise.all([
        supabase.from('faq_categories').select('id, name').order('order', { ascending: true }),
        supabase.from('faq_articles').select('*').order('created_at', { ascending: false })
      ]);

      if (catRes.error) throw catRes.error;
      if (artRes.error) throw artRes.error;

      setCategories(catRes.data || []);
      setArticles(artRes.data || []);
    } catch (err: any) {
      console.error('Error fetching FAQ data:', err);
      setError('Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!editForm.title || !editForm.slug || !editForm.category_id || !editForm.content) {
      setError('Le titre, le slug, la catégorie et le contenu sont obligatoires.');
      return;
    }

    try {
      setError(null);
      const newOrder = articles.filter(a => a.category_id === editForm.category_id).length;
      
      const { data, error } = await supabase
        .from('faq_articles')
        .insert([{ 
          title: editForm.title, 
          slug: editForm.slug, 
          category_id: editForm.category_id,
          content: editForm.content,
          status: editForm.status || 'draft',
          tags: editForm.tags || [],
          order: newOrder 
        }])
        .select()
        .single();

      if (error) throw error;
      
      setArticles([data, ...articles]);
      setIsCreating(false);
      setEditForm({});
    } catch (err: any) {
      console.error('Error creating article:', err);
      setError('Erreur lors de la création de l\'article.');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editForm.title || !editForm.slug || !editForm.category_id || !editForm.content) {
      setError('Le titre, le slug, la catégorie et le contenu sont obligatoires.');
      return;
    }

    try {
      setError(null);
      const { data, error } = await supabase
        .from('faq_articles')
        .update({
          title: editForm.title,
          slug: editForm.slug,
          category_id: editForm.category_id,
          content: editForm.content,
          status: editForm.status,
          tags: editForm.tags
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setArticles(articles.map(a => a.id === id ? data : a));
      setIsEditing(null);
      setEditForm({});
    } catch (err: any) {
      console.error('Error updating article:', err);
      setError('Erreur lors de la modification de l\'article.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

    try {
      setError(null);
      const { error } = await supabase
        .from('faq_articles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setArticles(articles.filter(a => a.id !== id));
    } catch (err: any) {
      console.error('Error deleting article:', err);
      setError('Erreur lors de la suppression.');
    }
  };

  const toggleStatus = async (article: FaqArticle) => {
    try {
      const newStatus = article.status === 'published' ? 'draft' : 'published';
      const { data, error } = await supabase
        .from('faq_articles')
        .update({ status: newStatus })
        .eq('id', article.id)
        .select()
        .single();

      if (error) throw error;
      setArticles(articles.map(a => a.id === article.id ? data : a));
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const filteredArticles = selectedCategory === 'all' 
    ? articles 
    : articles.filter(a => a.category_id === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-frilya-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Articles FAQ</h2>
          <p className="text-sm text-slate-500">Rédigez et gérez les réponses de votre FAQ</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-frilya-500 bg-white"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          
          <button
            onClick={() => {
              setIsCreating(true);
              setEditForm({ status: 'draft', category_id: categories.length > 0 ? categories[0].id : '' });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-frilya-600 text-white rounded-lg hover:bg-frilya-700 transition-colors text-sm font-medium whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nouvel article
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {isCreating && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
          <h3 className="font-bold text-slate-900 mb-4">Créer un article</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Titre de la question</label>
              <input
                type="text"
                value={editForm.title || ''}
                onChange={e => setEditForm({...editForm, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-frilya-500"
                placeholder="Ex: Comment annuler une commande ?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
              <select
                value={editForm.category_id || ''}
                onChange={e => setEditForm({...editForm, category_id: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-frilya-500"
              >
                <option value="" disabled>Sélectionner une catégorie</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Slug (URL)</label>
              <input
                type="text"
                value={editForm.slug || ''}
                onChange={e => setEditForm({...editForm, slug: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-frilya-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Contenu (HTML ou Markdown supporté)</label>
              <textarea
                value={editForm.content || ''}
                onChange={e => setEditForm({...editForm, content: e.target.value})}
                rows={8}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-frilya-500 font-mono text-sm"
                placeholder="<p>Votre réponse ici...</p>"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
              <select
                value={editForm.status || 'draft'}
                onChange={e => setEditForm({...editForm, status: e.target.value as 'draft' | 'published'})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-frilya-500"
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-frilya-600 text-white rounded-lg hover:bg-frilya-700 text-sm font-medium flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Enregistrer
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm font-medium"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-200">
          {filteredArticles.length === 0 && !isCreating ? (
            <div className="p-8 text-center text-slate-500">
              Aucun article trouvé.
            </div>
          ) : (
            filteredArticles.map((article) => {
              const catName = categories.find(c => c.id === article.category_id)?.name || 'Inconnue';
              
              if (isEditing === article.id) {
                return (
                  <div key={article.id} className="p-6 bg-slate-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Titre de la question</label>
                        <input
                          type="text"
                          value={editForm.title || ''}
                          onChange={e => setEditForm({...editForm, title: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
                        <select
                          value={editForm.category_id || ''}
                          onChange={e => setEditForm({...editForm, category_id: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        >
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                        <input
                          type="text"
                          value={editForm.slug || ''}
                          onChange={e => setEditForm({...editForm, slug: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contenu</label>
                        <textarea
                          value={editForm.content || ''}
                          onChange={e => setEditForm({...editForm, content: e.target.value})}
                          rows={6}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
                        <select
                          value={editForm.status || 'draft'}
                          onChange={e => setEditForm({...editForm, status: e.target.value as 'draft' | 'published'})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        >
                          <option value="draft">Brouillon</option>
                          <option value="published">Publié</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleUpdate(article.id)}
                        className="px-4 py-2 bg-frilya-600 text-white rounded-lg hover:bg-frilya-700 text-sm font-medium flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" /> Sauvegarder
                      </button>
                      <button
                        onClick={() => setIsEditing(null)}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm font-medium"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={article.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                        article.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {article.status === 'published' ? 'Publié' : 'Brouillon'}
                      </span>
                      <span className="text-xs text-frilya-600 font-medium bg-frilya-50 px-2 py-0.5 rounded-full">
                        {catName}
                      </span>
                      <span className="text-xs text-slate-400">
                        {article.views_count} vues
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 truncate" title={article.title}>
                      {article.title}
                    </h4>
                    <p className="text-xs text-slate-500 truncate mt-1">/{article.slug}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleStatus(article)}
                      className={`p-2 rounded-lg transition-colors ${
                        article.status === 'published' 
                          ? 'text-green-600 hover:bg-green-50' 
                          : 'text-slate-400 hover:bg-slate-100'
                      }`}
                      title={article.status === 'published' ? 'Passer en brouillon' : 'Publier'}
                    >
                      {article.status === 'published' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(article.id);
                        setEditForm(article);
                      }}
                      className="p-2 text-slate-400 hover:text-frilya-600 hover:bg-frilya-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(article.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
