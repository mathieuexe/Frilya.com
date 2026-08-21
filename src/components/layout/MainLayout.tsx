import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Header from './Header';
import Footer from './Footer';
import BetaFeedbackWidget from '../BetaFeedbackWidget';
import BetaCountdown, { BETA_START, BETA_END } from '../BetaCountdown';

export default function MainLayout() {
  const now = new Date();
  const showBetaCountdown = now >= BETA_START && now < BETA_END;

  // Heartbeat to update last_seen
  useEffect(() => {
    const updateLastSeen = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', session.user.id);
      }
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 2 * 60 * 1000); // 2 minutes
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-frilya-100 selection:text-frilya-900">
      {showBetaCountdown && <BetaCountdown mode="beta" />}
      <Header />
      
      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
      <BetaFeedbackWidget />
    </div>
  );
}