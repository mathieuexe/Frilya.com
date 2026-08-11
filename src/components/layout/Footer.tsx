import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { Mail, ShieldCheck } from 'lucide-react';
import stripeLogo from '../../assets/stripe.svg';
import pciLogo from '../../assets/pci-dss-compliant-logo-vector.svg';
import creditCardIcon from '../../assets/credit-card.png';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 pt-12 pb-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
          <div className="md:col-span-1">
            <Link to="/">
              <img src={logo} alt="Frilya" className="h-8 w-auto mb-4 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all" />
            </Link>
            <p className="text-sm text-slate-500 mb-4">
              Les talents français pour tous vos projets. Une plateforme simple, rapide et sécurisée.
            </p>
            <a href="mailto:contact@frilya.com" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-frilya-600">
              <Mail className="w-4 h-4" /> contact@frilya.com
            </a>
          </div>
          
          <div>
            <h3 className="font-bold text-slate-900 mb-4">À propos</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link to="/about" className="hover:text-frilya-600 transition-colors">Qui sommes-nous ?</Link></li>
              <li><Link to="/comment-ca-marche" className="hover:text-frilya-600 transition-colors">Comment ça marche</Link></li>
              <li><Link to="/vendeur/onboarding" className="hover:text-frilya-600 transition-colors">Devenir vendeur</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-slate-900 mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link to="/faq" className="hover:text-frilya-600 transition-colors">Centre d'aide (FAQ)</Link></li>
              <li><Link to="/contact" className="hover:text-frilya-600 transition-colors">Nous contacter</Link></li>
              <li><Link to="/litiges" className="hover:text-frilya-600 transition-colors">Signaler un problème</Link></li>
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

          {/* Security */}
          <div className="md:col-span-1">
            <h3 className="font-bold text-slate-900 mb-4 uppercase text-sm tracking-wider">Sécurité</h3>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <img src={creditCardIcon} alt="Paiement sécurisé" className="w-6 h-6 opacity-70" />
                <span className="font-bold text-slate-700 text-sm">Paiements 100% sécurisés</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Paiement chiffré de bout en bout par Stripe.
              </p>
              <div className="flex items-center gap-3">
                <img src={stripeLogo} alt="Stripe" className="h-6 opacity-60 grayscale" />
                <img src={pciLogo} alt="PCI DSS Compliant" className="h-6 opacity-60 grayscale" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Frilya. Tous droits réservés.
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            Paiements 100% sécurisés
          </div>
        </div>
      </div>
    </footer>
  );
}