import { useEffect, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowLeft } from 'lucide-react';
import DOMPurify from 'dompurify';

export default function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [pageData, setPageData] = useState<{ title: string; content: string; updated_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchPage() {
      if (!slug) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('legal_pages')
          .select('title, content, updated_at')
          .eq('slug', slug)
          .single();

        if (error || !data) {
          setError(true);
        } else {
          setPageData(data);
          setError(false);
        }
      } catch (err) {
        console.error("Erreur de chargement de la page légale:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-32 pb-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-frilya-600" />
      </div>
    );
  }

  if (error || !pageData) {
    return <Navigate to="/" replace />;
  }

  // Purifier le HTML pour éviter les failles XSS
  const sanitizedContent = DOMPurify.sanitize(pageData.content || '');

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'accueil
        </Link>
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 md:p-12 border-b border-slate-100 bg-slate-50/50">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">{pageData.title}</h1>
            <p className="text-slate-500 text-sm">
              Dernière mise à jour : {new Date(pageData.updated_at).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          
          <div className="p-8 md:p-12">
            <div 
              className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-frilya-600 hover:prose-a:text-frilya-700 prose-img:rounded-xl"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
