import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, ChevronRight, Home, FileText } from 'lucide-react';

interface FaqCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface FaqArticle {
  id: string;
  title: string;
  slug: string;
  views_count: number;
}

export default function FaqCategory() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<FaqCategory | null>(null);
  const [articles, setArticles] = useState<FaqArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchCategoryAndArticles(slug);
    }
  }, [slug]);

  const fetchCategoryAndArticles = async (categorySlug: string) => {
    try {
      setLoading(true);
      
      // Fetch category
      const { data: catData, error: catError } = await supabase
        .from('faq_categories')
        .select('*')
        .eq('slug', categorySlug)
        .single();

      if (catError) throw catError;
      setCategory(catData);

      // Fetch articles
      const { data: artData, error: artError } = await supabase
        .from('faq_articles')
        .select('id, title, slug, views_count')
        .eq('category_id', catData.id)
        .eq('status', 'published')
        .order('order', { ascending: true });

      if (artError) throw artError;
      setArticles(artData || []);
      
    } catch (err) {
      console.error('Error fetching category:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-frilya-600" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Catégorie introuvable</h2>
        <p className="text-slate-500 mb-6">La catégorie que vous cherchez n'existe pas ou a été supprimée.</p>
        <Link to="/faq" className="text-frilya-600 font-medium hover:underline flex items-center gap-2">
          <Home className="w-4 h-4" /> Retour au centre d'aide
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <nav className="flex items-center text-sm text-slate-500">
            <Link to="/" className="hover:text-frilya-600 transition-colors">Accueil</Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <Link to="/faq" className="hover:text-frilya-600 transition-colors">FAQ</Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="text-slate-900 font-medium">{category.name}</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">{category.name}</h1>
        {category.description && (
          <p className="text-lg text-slate-600">{category.description}</p>
        )}
      </div>

      {/* Articles List */}
      <div className="max-w-4xl mx-auto px-4">
        {articles.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun article</h3>
            <p className="text-slate-500">Il n'y a pas encore d'article publié dans cette catégorie.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {articles.map((article) => (
              <Link 
                key={article.id} 
                to={`/faq/article/${article.slug}`}
                className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <FileText className="w-6 h-6 text-frilya-300 mt-0.5 group-hover:text-frilya-600 transition-colors" />
                  <div>
                    <h3 className="font-medium text-slate-900 group-hover:text-frilya-600 transition-colors">
                      {article.title}
                    </h3>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-frilya-600 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
