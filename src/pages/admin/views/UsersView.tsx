import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, Search, Trash2, CheckCircle, Eye, Plus, User, Mail, Lock, X } from 'lucide-react';
import catAvatar from '../../../assets/cat.png';
import verifiedIcon from '../../../assets/verified.png';
import { createClient } from '@supabase/supabase-js';

import { useNavigate } from 'react-router-dom';

// Configuration pour un client qui ne modifie pas la session en cours (Admin)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bkrfulpstfhpnlrwocdt.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_4Wsxiu9dY6jTMHEnSvAqmg_74mhGlBb';
const adminAuthClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

export default function UsersView({ type }: { type: 'acheteur' | 'vendeur' }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // States pour la création d'utilisateur
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ fullName: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const navigate = useNavigate();

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      // 1. Créer l'utilisateur via Auth avec un client sans persistance de session
      const { data: signUpData, error: signUpError } = await adminAuthClient.auth.signUp({
        email: newUserForm.email,
        password: newUserForm.password,
        options: {
          data: {
            full_name: newUserForm.fullName,
          }
        }
      });

      if (signUpError) throw signUpError;

      // 2. Si le trigger handle_new_user n'a pas pu gérer le rôle ou s'il y a un délai,
      // on force la mise à jour / création dans la table profiles
      if (signUpData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: signUpData.user.id,
            email: newUserForm.email,
            full_name: newUserForm.fullName,
            role: 'acheteur',
            is_seller: type === 'vendeur'
          }, { onConflict: 'id' });
          
        if (profileError) {
          console.error("Erreur lors de la création du profil (fallback):", profileError);
        }
      }

      // 3. Rafraîchir la liste et fermer
      fetchUsers();
      setIsCreatingUser(false);
      setNewUserForm({ fullName: '', email: '', password: '' });
      alert("Utilisateur créé avec succès ! Un email de confirmation lui a été envoyé s'il est configuré.");
      
    } catch (err: any) {
      console.error(err);
      setCreateError(err.message || 'Une erreur est survenue lors de la création.');
    } finally {
      setCreating(false);
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
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
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
          <button 
            onClick={() => setIsCreatingUser(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Créer
          </button>
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
                        onClick={() => navigate(`/admin/users/${user.id}`)}
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

      {/* Modal de création d'utilisateur */}
      {isCreatingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">
                Ajouter un {type === 'vendeur' ? 'vendeur' : 'acheteur'}
              </h2>
              <button onClick={() => setIsCreatingUser(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-5">
              {createError && (
                <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nom complet</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={newUserForm.fullName}
                    onChange={(e) => setNewUserForm({...newUserForm, fullName: e.target.value})}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 transition-all outline-none"
                    placeholder="Jean Dupont"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Adresse Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 transition-all outline-none"
                    placeholder="vous@exemple.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Mot de passe provisoire</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 transition-all outline-none"
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Ce mot de passe permettra à l'utilisateur de se connecter. Il pourra le changer par la suite.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingUser(false)}
                  className="px-5 py-2.5 text-slate-500 hover:text-slate-700 font-bold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 bg-frilya-600 hover:bg-frilya-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70"
                >
                  {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  Créer le compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
