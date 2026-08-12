import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, ChevronRight, HelpCircle, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface FaqCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  article_count?: number;
}

interface FaqArticle {
  id: string;
  title: string;
  slug: string;
  category: { name: string, slug: string };
}

export default function FaqHome() {
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FaqArticle[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  // Inline debounce for simplicity
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (debouncedSearch.trim().length > 2) {
      searchArticles(debouncedSearch);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch]);

  const fetchCategories = async () => {
    try {
      const { data: cats, error: catError } = await supabase
        .from('faq_categories')
        .select('*')
        .order('order', { ascending: true });

      if (catError) throw catError;

      // Count articles per category
      const { data: articles, error: artError } = await supabase
        .from('faq_articles')
        .select('category_id')
        .eq('status', 'published');

      if (artError) throw artError;

      const catsWithCount = cats.map(cat => ({
        ...cat,
        article_count: articles.filter(a => a.category_id === cat.id).length
      }));

      setCategories(catsWithCount);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchArticles = async (query: string) => {
    setIsSearching(true);
    try {
      // Basic ilike search for MVP
      const { data, error } = await supabase
        .from('faq_articles')
        .select(`
          id, title, slug,
          category:faq_categories(name, slug)
        `)
        .eq('status', 'published')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      
      // The join returns category as an array or object depending on relation, usually object for many-to-one
      setSearchResults((data as any[]) || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-frilya-600" />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* Hero Section */}
      <div className="bg-frilya-600 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Centre d'aide Frilya</h1>
          <p className="text-frilya-100 mb-8 text-lg">Comment pouvons-nous vous aider aujourd'hui ?</p>
          
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-12 pr-4 py-4 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-frilya-400 shadow-lg text-lg"
              placeholder="Rechercher une question, un mot-clé..."
            />
            {isSearching && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
              </div>
            )}

            {/* Search Results Dropdown */}
            {searchQuery.trim().length > 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl overflow-hidden z-50 text-left border border-slate-100">
                {searchResults.length > 0 ? (
                  <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                    {searchResults.map((article) => (
                      <li key={article.id}>
                        <Link 
                          to={`/faq/article/${article.slug}`}
                          className="block px-6 py-4 hover:bg-slate-50 transition-colors"
                        >
                          <div className="font-medium text-slate-900 mb-1">{article.title}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            Dans <span className="font-medium text-frilya-600">{article.category?.name}</span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-6 py-8 text-center text-slate-500">
                    <p className="mb-4">Aucun résultat trouvé pour "{searchQuery}"</p>
                    <button 
                      onClick={() => navigate('/faq/contact')} // Route à gérer si besoin, ou scroll
                      className="text-frilya-600 font-medium hover:underline"
                    >
                      Contacter le support
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-5xl mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link 
              key={category.id} 
              to={`/faq/categorie/${category.slug}`}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-frilya-200 transition-all group flex flex-col h-full"
            >
              <div className="w-12 h-12 bg-frilya-50 rounded-xl flex items-center justify-center text-frilya-600 mb-4 group-hover:scale-110 transition-transform">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-frilya-600 transition-colors">
                {category.name}
              </h3>
              <p className="text-sm text-slate-500 mb-4 flex-1">
                {category.description}
              </p>
              <div className="flex items-center text-sm font-medium text-frilya-600">
                <span>{category.article_count} article{category.article_count !== 1 ? 's' : ''}</span>
                <ChevronRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
