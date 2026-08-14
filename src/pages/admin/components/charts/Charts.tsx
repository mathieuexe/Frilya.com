/**
 * Briques graphiques de l'onglet Statistique.
 *
 * Palette validée (contrôles de lisibilité et daltonisme passés sur surface claire) :
 *   série 1 : #023BE6 (frilya-500)   série 2 : #B54708
 * Les libellés et valeurs restent en encre slate : la couleur ne porte jamais
 * l'information à elle seule (légende + libellés directs).
 */

export const SERIES_1 = '#023BE6';
export const SERIES_2 = '#B54708';

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'text-slate-900'
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: any;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        {Icon && <Icon className="w-4 h-4 text-slate-300 shrink-0" />}
      </div>
      <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

/** Barres groupées : une colonne par jour, deux séries comparables sur un seul axe */
export function DailyBars({
  data,
  series
}: {
  data: { label: string; values: number[] }[];
  series: { name: string; color: string }[];
}) {
  const max = Math.max(1, ...data.flatMap(d => d.values));

  if (data.length === 0) {
    return <p className="text-sm text-slate-400 py-10 text-center">Aucune donnée sur la période.</p>;
  }

  return (
    <div>
      {/* Légende : toujours présente dès deux séries */}
      <div className="flex items-center gap-4 mb-4">
        {series.map(s => (
          <span key={s.name} className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
        <span className="ml-auto text-[11px] text-slate-400">Max : {max.toLocaleString('fr-FR')}</span>
      </div>

      <div className="flex items-end gap-[3px] h-40">
        {data.map((day, i) => (
          <div key={i} className="flex-1 min-w-0 h-full flex items-end justify-center gap-[2px] group relative">
            {day.values.map((v, j) => (
              <div
                key={j}
                className="w-full max-w-[10px] rounded-t transition-opacity group-hover:opacity-80"
                style={{
                  height: `${Math.max((v / max) * 100, v > 0 ? 2 : 0)}%`,
                  backgroundColor: series[j]?.color || SERIES_1
                }}
              />
            ))}
            {/* Infobulle au survol de la colonne */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 whitespace-nowrap bg-slate-900 text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-xl">
              <span className="font-bold">{day.label}</span>
              {day.values.map((v, j) => (
                <span key={j} className="block">
                  {series[j]?.name} : {v.toLocaleString('fr-FR')}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between mt-2 text-[11px] text-slate-400">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/** Classement en barres horizontales : magnitude, une seule teinte, valeur libellée */
export function RankBars({
  rows,
  unit,
  emptyLabel = 'Aucune donnée sur la période.',
  color = SERIES_1
}: {
  rows: { label: string; value: number; sub?: string }[];
  unit?: string;
  emptyLabel?: string;
  color?: string;
}) {
  const max = Math.max(1, ...rows.map(r => r.value));

  if (rows.length === 0) {
    return <p className="text-sm text-slate-400 py-8 text-center">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={`${row.label}-${i}`} className="group">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="text-sm text-slate-700 truncate" title={row.label}>
              {row.label}
              {row.sub && <span className="text-slate-400 text-xs ml-2">{row.sub}</span>}
            </span>
            <span className="text-sm font-bold text-slate-900 shrink-0 tabular-nums">
              {row.value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}{unit ? ` ${unit}` : ''}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all group-hover:opacity-80"
              style={{ width: `${Math.max((row.value / max) * 100, 1)}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Bloc de contenu d'un widget, avec état d'erreur explicite */
export function Panel({
  title,
  subtitle,
  error,
  children,
  className = ''
}: {
  title: string;
  subtitle?: string;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 break-words">{error}</p>
      ) : (
        children
      )}
    </div>
  );
}
