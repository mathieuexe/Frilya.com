import { Link } from 'react-router-dom';
import { Search, Menu, User, Bell, MessageSquare } from 'lucide-react';
import logo from '../../assets/logo.png';
import { useState } from 'react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Left: Logo & Search */}
        <div className="flex items-center gap-6 flex-1">
          <Link to="/" className="shrink-0">
            <img src={logo} alt="Frilya" className="h-8 w-auto" />
          </Link>
          
          <div className="hidden md:flex flex-1 max-w-md relative">
            <input 
              type="text" 
              placeholder="Quel service recherchez-vous ?" 
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-full pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-frilya-600/20 focus:border-frilya-600 transition-all"
            />
            <Link to="/search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-frilya-600 transition-colors">
              <Search className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/vendeur/onboarding" className="text-sm font-bold text-slate-600 hover:text-frilya-900 transition-colors mr-2">
            Devenir vendeur
          </Link>
          
          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <Link to="/messages" className="p-2 text-slate-500 hover:text-frilya-600 hover:bg-slate-50 rounded-full transition-all relative">
              <MessageSquare className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </Link>
            <Link to="/notifications" className="p-2 text-slate-500 hover:text-frilya-600 hover:bg-slate-50 rounded-full transition-all">
              <Bell className="w-5 h-5" />
            </Link>
            <Link to="/dashboard" className="flex items-center gap-2 p-1.5 pr-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full transition-all ml-2">
              <div className="w-7 h-7 bg-frilya-100 text-frilya-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-slate-700">Mon compte</span>
            </Link>
          </div>
        </div>

        {/* Mobile menu button */}
        <button 
          className="md:hidden p-2 text-slate-600"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white absolute w-full shadow-lg">
          <div className="p-4 space-y-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Rechercher..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/dashboard" className="flex items-center justify-center gap-2 bg-slate-50 py-2.5 rounded-xl text-sm font-bold text-slate-700 border border-slate-100">
                <User className="w-4 h-4" /> Compte
              </Link>
              <Link to="/messages" className="flex items-center justify-center gap-2 bg-slate-50 py-2.5 rounded-xl text-sm font-bold text-slate-700 border border-slate-100">
                <MessageSquare className="w-4 h-4" /> Messages
              </Link>
            </div>
            <Link to="/vendeur/onboarding" className="block text-center w-full bg-frilya-900 text-white font-bold py-2.5 rounded-xl text-sm">
              Devenir vendeur
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}