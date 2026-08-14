import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import BetaFeedbackWidget from '../BetaFeedbackWidget';
import BetaCountdown, { BETA_START, BETA_END } from '../BetaCountdown';

export default function MainLayout() {
  const now = new Date();
  const showBetaCountdown = now >= BETA_START && now < BETA_END;

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