import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { ShieldCheck } from 'lucide-react';
import pciLogo from '../../assets/pci-dss-compliant-logo-vector.svg';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 pt-12 pb-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-1">
            <Link to="/">
              <img src={logo} alt="Frilya" className="h-8 w-auto mb-4 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all" />
            </Link>
            <p className="text-sm text-slate-500 mb-4">
              Les talents français pour tous vos projets. Une plateforme simple, rapide et sécurisée.
            </p>
          </div>
          
          <div>
            <h3 className="font-bold text-slate-900 mb-4">À propos</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link to="/about" className="hover:text-frilya-600 transition-colors">Qui sommes-nous ?</Link></li>
              <li><Link to="/comment-ca-marche" className="hover:text-frilya-600 transition-colors">Comment ça marche</Link></li>
              <li><Link to="/vendeur/inscription" className="hover:text-frilya-600 transition-colors">Devenir vendeur</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-slate-900 mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link to="/faq" className="hover:text-frilya-600 transition-colors">Centre d'aide (FAQ)</Link></li>
              <li><Link to="/signaler-probleme" className="hover:text-frilya-600 transition-colors">Support & Signalement</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-slate-900 mb-4">Légal</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link to="/cgu" className="hover:text-frilya-600 transition-colors">Conditions Générales d'Utilisation</Link></li>
              <li><Link to="/cgv" className="hover:text-frilya-600 transition-colors">Conditions Générales de Vente</Link></li>
              <li><Link to="/confidentialite" className="hover:text-frilya-600 transition-colors">Politique de confidentialité</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Frilya. Tous droits réservés.
          </p>
          <div className="flex flex-col items-end gap-2 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              Paiements 100% sécurisés
            </div>
            <img src={pciLogo} alt="PCI DSS Compliant" className="h-16 opacity-70 grayscale" />
          </div>
        </div>
      </div>
    </footer>
  );
}