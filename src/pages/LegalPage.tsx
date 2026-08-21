import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';
import DOMPurify from 'dompurify';

export default function LegalPage({ slug }: { slug: string }) {
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
    <div className="min-h-screen bg-white pt-24 pb-12 sm:pt-32 sm:pb-20">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-2">{pageData.title}</h1>
          <p className="text-slate-500 text-sm">
            Dernière mise à jour : {new Date(pageData.updated_at).toLocaleDateString('fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        
        <div 
          className="prose prose-sm sm:prose-base prose-slate max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-slate-800 prose-p:leading-relaxed prose-a:text-frilya-600 hover:prose-a:text-frilya-700 prose-img:rounded-xl whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      </div>
    </div>
  );
}
