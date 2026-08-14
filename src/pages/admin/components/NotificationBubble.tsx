type Tone = 'danger' | 'warning' | 'info' | 'neutral';

const TONES: Record<Tone, string> = {
  danger: 'bg-red-500 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-frilya-500 text-white',
  neutral: 'bg-slate-200 text-slate-700'
};

/**
 * Bulle de notification (compteur) affichée dans la navigation admin.
 * Ne s'affiche pas si le compteur est à zéro.
 */
export default function NotificationBubble({
  count,
  tone = 'danger',
  className = '',
  pulse = false
}: {
  count: number;
  tone?: Tone;
  className?: string;
  pulse?: boolean;
}) {
  if (!count) return null;

  return (
    <span className={`relative inline-flex items-center justify-center ${className}`}>
      {pulse && (
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${TONES[tone]}`} />
      )}
      <span
        className={`relative min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold leading-5 text-center shadow-sm ${TONES[tone]}`}
      >
        {count > 99 ? '99+' : count}
      </span>
    </span>
  );
}
