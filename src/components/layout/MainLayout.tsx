import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import BetaFeedbackWidget from '../BetaFeedbackWidget';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-frilya-100 selection:text-frilya-900">
      <Header />
      
      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
      <BetaFeedbackWidget />
    </div>
  );
}