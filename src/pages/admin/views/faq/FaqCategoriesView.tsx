import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Loader2, Plus, Edit2, Trash2, Save, X, AlertCircle } from 'lucide-react';

interface FaqCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  order: number;
}

export default function FaqCategoriesView() {
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FaqCategory>>({});
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('faq_categories')
        .select('*')
        .order('order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setError('Impossible de charger les catégories.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!editForm.name || !editForm.slug) {
      setError('Le nom et le slug sont obligatoires.');
      return;
    }

    try {
      setError(null);
      const newOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order)) + 1 : 0;
      
      const { data, error } = await supabase
        .from('faq_categories')
        .insert([{ 
          name: editForm.name, 
          slug: editForm.slug, 
          description: editForm.description || '', 
          icon: editForm.icon || '', 
          order: newOrder 
        }])
        .select()
        .single();

      if (error) throw error;
      
      setCategories([...categories, data]);
      setIsCreating(false);
      setEditForm({});
    } catch (err: any) {
      console.error('Error creating category:', err);
      setError('Erreur lors de la création de la catégorie.');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editForm.name || !editForm.slug) {
      setError('Le nom et le slug sont obligatoires.');
      return;
    }

    try {
      setError(null);
      const { data, error } = await supabase
        .from('faq_categories')
        .update({
          name: editForm.name,
          slug: editForm.slug,
          description: editForm.description,
          icon: editForm.icon
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setCategories(categories.map(c => c.id === id ? data : c));
      setIsEditing(null);
      setEditForm({});
    } catch (err: any) {
      console.error('Error updating category:', err);
      setError('Erreur lors de la modification de la catégorie.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ? Les articles associés pourraient être orphelins.')) return;

    try {
      setError(null);
      const { error } = await supabase
        .from('faq_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCategories(categories.filter(c => c.id !== id));
    } catch (err: any) {
      console.error('Error deleting category:', err);
      setError('Erreur lors de la suppression.');
    }
  };

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === categories.length - 1)
    ) return;

    const newCategories = [...categories];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap order values
    const tempOrder = newCategories[index].order;
    newCategories[index].order = newCategories[swapIndex].order;
    newCategories[swapIndex].order = tempOrder;
    
    // Swap array positions
    const tempCat = newCategories[index];
    newCategories[index] = newCategories[swapIndex];
    newCategories[swapIndex] = tempCat;

    setCategories(newCategories);

    try {
      // Update both in DB
      await Promise.all([
        supabase.from('faq_categories').update({ order: newCategories[index].order }).eq('id', newCategories[index].id),
        supabase.from('faq_categories').update({ order: newCategories[swapIndex].order }).eq('id', newCategories[swapIndex].id)
      ]);
    } catch (err) {
      console.error('Error reordering:', err);
      setError('Erreur lors de la réorganisation.');
      fetchCategories(); // revert on error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-frilya-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Catégories FAQ</h2>
          <p className="text-sm text-slate-500">Gérez les catégories de votre Foire Aux Questions</p>
        </div>
        <button
          onClick={() => {
            setIsCreating(true);
            setEditForm({});
          }}
          className="flex items-center gap-2 px-4 py-2 bg-frilya-600 text-white rounded-lg hover:bg-frilya-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Nouvelle catégorie
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isCreating && (
          <div className="p-6 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-900 mb-4">Créer une catégorie</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={e => setEditForm({...editForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-frilya-500 focus:border-frilya-500"
                  placeholder="Ex: Paiement"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug (URL)</label>
                <input
                  type="text"
                  value={editForm.slug || ''}
                  onChange={e => setEditForm({...editForm, slug: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-frilya-500 focus:border-frilya-500"
                  placeholder="Ex: paiement"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editForm.description || ''}
                  onChange={e => setEditForm({...editForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-frilya-500 focus:border-frilya-500"
                  placeholder="Courte description de la catégorie"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Icône (optionnel)</label>
                <input
                  type="text"
                  value={editForm.icon || ''}
                  onChange={e => setEditForm({...editForm, icon: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-frilya-500 focus:border-frilya-500"
                  placeholder="Nom de l'icône Lucide (ex: CreditCard)"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-frilya-600 text-white rounded-lg hover:bg-frilya-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Enregistrer
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-slate-200">
          {categories.length === 0 && !isCreating ? (
            <div className="p-8 text-center text-slate-500">
              Aucune catégorie pour le moment.
            </div>
          ) : (
            categories.map((category, index) => (
              <div key={category.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={() => moveCategory(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button 
                    onClick={() => moveCategory(index, 'down')}
                    disabled={index === categories.length - 1}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                
                <div className="flex-1">
                  {isEditing === category.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-slate-200">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Nom</label>
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                          className="w-full px-2 py-1 text-sm border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Slug</label>
                        <input
                          type="text"
                          value={editForm.slug || ''}
                          onChange={e => setEditForm({...editForm, slug: e.target.value})}
                          className="w-full px-2 py-1 text-sm border border-slate-300 rounded"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                        <input
                          type="text"
                          value={editForm.description || ''}
                          onChange={e => setEditForm({...editForm, description: e.target.value})}
                          className="w-full px-2 py-1 text-sm border border-slate-300 rounded"
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleUpdate(category.id)}
                          className="px-3 py-1 bg-frilya-600 text-white rounded hover:bg-frilya-700 text-xs font-medium flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" /> Sauvegarder
                        </button>
                        <button
                          onClick={() => setIsEditing(null)}
                          className="px-3 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 text-xs font-medium flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-bold text-slate-900 flex items-center gap-2">
                        {category.name}
                        <span className="text-xs font-normal px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                          /{category.slug}
                        </span>
                      </h4>
                      {category.description && (
                        <p className="text-sm text-slate-500 mt-1">{category.description}</p>
                      )}
                    </div>
                  )}
                </div>

                {isEditing !== category.id && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsEditing(category.id);
                        setEditForm(category);
                      }}
                      className="p-2 text-slate-400 hover:text-frilya-600 transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
