import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const BETA_START = new Date('2026-08-21T18:00:00+02:00');
export const BETA_END = new Date('2026-08-24T18:00:00+02:00');

interface BetaCountdownProps {
  mode: 'maintenance' | 'beta';
}

export default function BetaCountdown({ mode }: BetaCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const targetDate = mode === 'maintenance' ? BETA_START : BETA_END;
      const difference = targetDate.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          d: Math.floor(difference / (1000 * 60 * 60 * 24)),
          h: Math.floor((difference / (1000 * 60 * 60)) % 24),
          m: Math.floor((difference / 1000 / 60) % 60),
          s: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [mode]);

  if (!timeLeft) return null;

  return (
    <div className="bg-frilya-900 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium w-full z-50">
      <Clock className="w-4 h-4 text-frilya-300" />
      <span>
        {mode === 'maintenance' ? "Lancement de la bêta dans :" : "Fin de la bêta dans :"}
      </span>
      <div className="flex items-center gap-1.5 font-bold tracking-wider">
        <span className="bg-white/20 px-2 py-0.5 rounded">{timeLeft.d}j</span>
        <span className="bg-white/20 px-2 py-0.5 rounded">{timeLeft.h}h</span>
        <span className="bg-white/20 px-2 py-0.5 rounded">{timeLeft.m}m</span>
        <span className="bg-white/20 px-2 py-0.5 rounded">{timeLeft.s}s</span>
      </div>
    </div>
  );
}