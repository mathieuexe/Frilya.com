import React from 'react';
import { Settings } from 'lucide-react';
import logo from '../assets/logo.png';

export default function Maintenance() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 selection:bg-frilya-100">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-lg w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-frilya-50 p-4 rounded-2xl border border-frilya-100 relative">
            <Settings className="w-12 h-12 text-frilya-600 animate-[spin_4s_linear_infinite]" />
            <div className="absolute -bottom-2 -right-2 bg-white p-1 rounded-full border border-slate-100 shadow-sm">
              <img src={logo} alt="Frilya" className="w-6 h-6 object-contain" />
            </div>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
          Maintenance en cours
        </h1>
        
        <p className="text-slate-500 text-lg leading-relaxed mb-8">
          Nous effectuons actuellement des mises à jour sur la plateforme. Frilya sera de retour très prochainement !
        </p>
        
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
          <p className="text-sm text-slate-600 font-medium">
            Suivez l'avancement sur notre serveur Discord
          </p>
          <a 
            href="https://discord.gg/3nmBgXX5Ef" 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm w-full"
          >
            Rejoindre le Discord
          </a>
        </div>
      </div>
    </div>
  );
}
