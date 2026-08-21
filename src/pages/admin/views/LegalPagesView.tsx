import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, Save, FileText, CheckCircle, AlertTriangle, Search, Plus } from 'lucide-react';

interface LegalPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  updated_at: string;
}

export default function LegalPagesView() {
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<LegalPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  
  // Editor state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  
  // Feedback state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('legal_pages')
        .select('*')
        .order('title');

      if (error) throw error;
      setPages(data || []);
      
      // Auto-select first page if none selected and pages exist
      if (data && data.length > 0 && !selectedPage) {
        selectPage(data[0]);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des pages:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectPage = (page: LegalPage) => {
    setSelectedPage(page);
    setEditTitle(page.title);
    setEditContent(page.content || '');
    setIsCreating(false);
    setFeedback(null);
  };

  const handleCreateNew = () => {
    setSelectedPage(null);
    setEditTitle('');
    setEditContent('');
    setNewSlug('');
    setIsCreating(true);
    setFeedback(null);
  };

  const handleSave = async () => {
    if (!isCreating && !selectedPage) return;
    if (isCreating && (!editTitle || !newSlug)) {
      setFeedback({ type: 'error', message: 'Le titre et le slug sont requis' });
      return;
    }
    
    setSaving(true);
    setFeedback(null);
    
    try {
      if (isCreating) {
        // Create new page
        const { data, error } = await supabase
          .from('legal_pages')
          .insert({
            title: editTitle,
            slug: newSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            content: editContent,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        setFeedback({ type: 'success', message: 'Page créée avec succès' });
        setPages([...pages, data]);
        selectPage(data);
      } else {
        // Update existing page
        const { error } = await supabase
          .from('legal_pages')
          .update({
            title: editTitle,
            content: editContent,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedPage!.id);

        if (error) throw error;

        setFeedback({ type: 'success', message: 'Page mise à jour avec succès' });
        
        // Update local state
        const updatedPages = pages.map(p => 
          p.id === selectedPage!.id 
            ? { ...p, title: editTitle, content: editContent, updated_at: new Date().toISOString() }
            : p
        );
        setPages(updatedPages);
        setSelectedPage({ ...selectedPage!, title: editTitle, content: editContent });
      }
      
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde:', err);
      if (err.code === '23505') {
        setFeedback({ type: 'error', message: 'Ce slug est déjà utilisé par une autre page' });
      } else {
        setFeedback({ type: 'error', message: 'Erreur lors de la sauvegarde' });
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredPages = pages.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-frilya-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pages Légales</h2>
          <p className="text-slate-500 text-sm">Gérez le contenu des pages légales (CGV, CGU, etc.)</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle page
          </button>
          
          {(selectedPage || isCreating) && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Liste des pages */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-250px)]">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-300 focus:ring-1 focus:ring-slate-300"
              />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {filteredPages.length === 0 ? (
              <div className="text-center p-4 text-sm text-slate-500">Aucune page trouvée</div>
            ) : (
              filteredPages.map(page => (
                <button
                  key={page.id}
                  onClick={() => selectPage(page)}
                  className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors ${
                    selectedPage?.id === page.id 
                      ? 'bg-slate-900 text-white' 
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <FileText className={`w-5 h-5 shrink-0 ${selectedPage?.id === page.id ? 'text-slate-300' : 'text-slate-400'}`} />
                  <div>
                    <div className="font-medium text-sm truncate">{page.title}</div>
                    <div className={`text-xs mt-0.5 ${selectedPage?.id === page.id ? 'text-slate-300' : 'text-slate-500'}`}>
                      /{page.slug}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Editeur */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-250px)]">
          {selectedPage || isCreating ? (
            <>
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Titre de la page</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="Ex: Mentions Légales"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-slate-300"
                  />
                </div>
                <div className="ml-4 pl-4 border-l border-slate-200 text-right w-1/3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">URL / Slug</div>
                  {isCreating ? (
                    <input
                      type="text"
                      value={newSlug}
                      onChange={e => setNewSlug(e.target.value)}
                      placeholder="mentions-legales"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-slate-300"
                    />
                  ) : (
                    <div className="text-sm font-mono bg-slate-100 px-2 py-1 rounded border border-slate-200">
                      /{selectedPage!.slug}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col p-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Contenu HTML</label>
                <textarea 
                  value={editContent} 
                  onChange={e => setEditContent(e.target.value)}
                  className="flex-1 w-full bg-slate-900 text-slate-100 p-4 font-mono text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  spellCheck="false"
                  placeholder="<h1>Titre</h1><p>Contenu...</p>"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <FileText className="w-12 h-12 mb-3 text-slate-300" />
              <p>Sélectionnez une page à éditer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
