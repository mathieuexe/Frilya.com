import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, Search } from 'lucide-react';

export default function MessagesView() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(full_name, email),
          receiver:profiles!messages_receiver_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-900">Supervision des Messages Privés</h2>
        <p className="text-slate-500 text-sm mt-1">Historique des 50 derniers messages échangés sur la plateforme.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold">Expéditeur</th>
              <th className="p-4 font-semibold">Destinataire</th>
              <th className="p-4 font-semibold">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-frilya-600" />
                </td>
              </tr>
            ) : messages.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  Aucun message trouvé.
                </td>
              </tr>
            ) : (
              messages.map((msg) => (
                <tr key={msg.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-slate-500 text-sm whitespace-nowrap">
                    {new Date(msg.created_at).toLocaleString('fr-FR', {
                      day: '2-digit', month: '2-digit', year: '2-digit',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-slate-900">{msg.sender?.full_name || 'Inconnu'}</div>
                    <div className="text-xs text-slate-500">{msg.sender?.email}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-slate-900">{msg.receiver?.full_name || 'Inconnu'}</div>
                    <div className="text-xs text-slate-500">{msg.receiver?.email}</div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {msg.content}
                    </p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
