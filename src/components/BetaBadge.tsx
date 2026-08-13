import { useState } from 'react';
import betaBadgeIcon from '../assets/lab-flask.png';

export function BetaBadge() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-flex items-center group">
      <img 
        src={betaBadgeIcon} 
        alt="Bêta-testeur" 
        className="w-6 h-6 cursor-pointer hover:scale-110 transition-transform"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowTooltip(!showTooltip);
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      />
      <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 pointer-events-none transition-opacity duration-200 text-center ${showTooltip ? 'opacity-100' : 'opacity-0'}`}>
        <strong>Bêta-testeur :</strong> J'étais présent lors de la bêta en 2026 !
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
      </div>
    </div>
  );
}
