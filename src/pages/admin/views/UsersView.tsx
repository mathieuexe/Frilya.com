import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, Search, Trash2, CheckCircle, Eye } from 'lucide-react';
import catAvatar from '../../../assets/cat.png';
import verifiedIcon from '../../../assets/verified.png';
import UserDossier from './UserDossier';

export default function UsersView({ type }: { type: 'acheteur' | 'vendeur' }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [type]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase.from('profiles').select('*');
      if (type === 'vendeur') {
        query = query.eq('is_seller', true);
      } else {
        query = query.eq('role', 'acheteur').eq('is_seller', false);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVerifyUser = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: !currentStatus })
        .eq('id', userId);
        
      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, is_verified: !currentStatus } : u));
    } catch (err) {
      console.error("Erreur lors de la vérification:", err);
      alert("Impossible de modifier le statut de vérification.");
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold text-slate-900">
          {type === 'vendeur' ? 'Gestion des Vendeurs' : 'Gestion des Acheteurs'}
        </h2>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold">Utilisateur</th>
              <th className="p-4 font-semibold">Email</th>
              <th className="p-4 font-semibold">Inscription</th>
              <th className="p-4 font-semibold">Statut</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-frilya-600" />
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={user.avatar_url || catAvatar} alt="" className="w-10 h-10 rounded-full object-cover bg-slate-100" />
                      <div className="font-bold text-slate-900 flex items-center gap-1">
                        {user.full_name || 'Sans nom'}
                        {user.is_verified && (
                          <img src={verifiedIcon} alt="Vérifié" className="w-4 h-4" title="Compte vérifié" />
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 text-sm">{user.email}</td>
                  <td className="p-4 text-slate-600 text-sm">
                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                      Actif
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => toggleVerifyUser(user.id, user.is_verified)}
                        className={`p-2 rounded-lg transition-colors ${user.is_verified ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`} 
                        title={user.is_verified ? "Retirer la certification" : "Certifier ce compte"}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setSelectedUser(user.id)}
                        className="p-2 text-slate-400 hover:text-frilya-600 hover:bg-frilya-50 rounded-lg transition-colors" 
                        title="Ouvrir le dossier complet"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Bannir/Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <UserDossier userId={selectedUser} onClose={() => { setSelectedUser(null); fetchUsers(); }} />
      )}
    </div>
  );
}
