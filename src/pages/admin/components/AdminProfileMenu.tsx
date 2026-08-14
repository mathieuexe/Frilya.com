import { LayoutPanelLeft, LayoutPanelTop, LogOut, ShieldAlert, ChevronDown } from 'lucide-react';

type Props = {
  profile: any;
  open: boolean;
  onToggle: () => void;
  onUpdatePreference: (key: string, value: string) => void;
  onLogout: () => void;
  /** compact = barre horizontale, full = colonne latérale */
  variant?: 'compact' | 'full';
};

function RadioRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 py-1.5 group text-left"
    >
      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
        active ? 'border-frilya-600' : 'border-slate-300 group-hover:border-frilya-400'
      }`}>
        {active && <span className="w-2 h-2 bg-frilya-600 rounded-full" />}
      </span>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </button>
  );
}

export default function AdminProfileMenu({
  profile, open, onToggle, onUpdatePreference, onLogout, variant = 'compact'
}: Props) {
  const isHorizontal = profile?.admin_layout !== 'vertical';
  const ticketIdentity = profile?.ticket_reply_identity || 'support';
  const messageIdentity = profile?.message_reply_identity || 'personal';

  return (
    <>
      <button
        onClick={onToggle}
        className={
          variant === 'compact'
            ? 'flex items-center gap-3 px-2 py-1.5 rounded-2xl hover:bg-white/10 transition-colors'
            : 'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors'
        }
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Admin" className="w-full h-full object-cover" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-slate-400" />
            )}
          </span>
          <span className="text-left min-w-0">
            <span className="block text-sm font-bold text-white leading-tight truncate">
              {profile?.full_name || 'Administrateur'}
            </span>
            <span className="block text-[11px] text-slate-400 leading-tight">Super administrateur</span>
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute ${variant === 'compact' ? 'right-0 top-full mt-2 w-80' : 'left-4 right-4 top-full mt-2'} bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Disposition de l'admin</p>
            <div className="flex items-center gap-2 bg-slate-200/60 p-1 rounded-xl">
              <button
                onClick={() => onUpdatePreference('admin_layout', 'vertical')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  !isHorizontal ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LayoutPanelLeft className="w-4 h-4" /> Latérale
              </button>
              <button
                onClick={() => onUpdatePreference('admin_layout', 'horizontal')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  isHorizontal ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LayoutPanelTop className="w-4 h-4" /> Horizontale
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Identité de réponse — Tickets</p>
            <RadioRow
              label="Support Frilya"
              active={ticketIdentity === 'support'}
              onClick={() => onUpdatePreference('ticket_reply_identity', 'support')}
            />
            <RadioRow
              label={`Nom personnel (${profile?.full_name || 'moi'})`}
              active={ticketIdentity === 'personal'}
              onClick={() => onUpdatePreference('ticket_reply_identity', 'personal')}
            />
          </div>

          <div className="p-4 border-b border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Identité de réponse — Messages</p>
            <RadioRow
              label={`Nom personnel (${profile?.full_name || 'moi'})`}
              active={messageIdentity === 'personal'}
              onClick={() => onUpdatePreference('message_reply_identity', 'personal')}
            />
            <RadioRow
              label="Support Frilya"
              active={messageIdentity === 'support'}
              onClick={() => onUpdatePreference('message_reply_identity', 'support')}
            />
            <p className="text-[11px] text-slate-400 mt-2">
              Les réponses depuis la boîte « Support SAV » partent toujours en tant que Support Frilya.
            </p>
          </div>

          <div className="p-2">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 py-2.5 px-4 rounded-xl hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors text-sm font-bold"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </>
  );
}
