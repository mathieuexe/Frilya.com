import {
  LayoutDashboard, Users, Store, ShoppingBag, MessageSquare, AlertTriangle,
  Settings, Beaker, LifeBuoy, Inbox, FileText, Activity, Tag, BarChart3, CreditCard
} from 'lucide-react';
import type { AdminCounts } from './AdminNotificationsContext';

export type AdminNavItem = {
  id: string;
  name: string;
  icon: any;
  /** Compteur de notifications associé à cette entrée */
  badge?: keyof AdminCounts;
  description?: string;
};

export type AdminNavCategory = {
  title: string;
  icon: any;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavCategory[] = [
  {
    title: 'Pilotage',
    icon: LayoutDashboard,
    items: [
      { id: 'dashboard', name: 'Tableau de bord', icon: LayoutDashboard, description: "Vue d'ensemble de la plateforme" },
      { id: 'stats', name: 'Statistique', icon: BarChart3, description: 'Audience, provenance, ventes et conversion' }
    ]
  },
  {
    title: 'Support & SAV',
    icon: LifeBuoy,
    items: [
      { id: 'support', name: 'Support SAV', icon: Inbox, badge: 'support', description: 'Messages privés reçus par Support Frilya' },
      { id: 'tickets', name: 'Tickets', icon: AlertTriangle, badge: 'tickets', description: 'Signalements et demandes utilisateurs' },
      { id: 'faq_categories', name: 'Catégories FAQ', icon: Tag, description: 'Organisation du centre d\'aide' },
      { id: 'faq_articles', name: 'Articles FAQ', icon: FileText, description: 'Contenu du centre d\'aide' }
    ]
  },
  {
    title: 'Utilisateurs',
    icon: Users,
    items: [
      { id: 'buyers', name: 'Acheteurs', icon: Users, description: 'Comptes acheteurs' },
      { id: 'sellers', name: 'Vendeurs', icon: Store, description: 'Comptes vendeurs' },
      { id: 'ibans', name: 'Vérification IBAN', icon: FileText, badge: 'ibans', description: 'Validation des RIB/IBAN' }
    ]
  },
  {
    title: 'Activité',
    icon: Activity,
    items: [
      { id: 'services', name: 'Services', icon: Store, description: 'Annonces publiées' },
      { id: 'orders', name: 'Commandes', icon: ShoppingBag, description: 'Transactions' },
      { id: 'withdrawals', name: 'Retraits', icon: CreditCard, badge: 'withdrawals', description: 'Demandes de retraits' },
      { id: 'messages', name: 'Supervision messages', icon: MessageSquare, description: 'Historique des messages privés' },
      { id: 'disputes', name: 'Litiges', icon: AlertTriangle, badge: 'disputes', description: 'Conflits acheteurs / vendeurs' }
    ]
  },
  {
    title: 'Système',
    icon: Settings,
    items: [
      { id: 'admins', name: 'Administrateurs', icon: Users, description: 'Gestion des comptes admins' },
      { id: 'beta', name: 'Gestion Bêta', icon: Beaker, badge: 'beta', description: 'Demandes, testeurs et feedbacks' },
      { id: 'legal', name: 'Pages Légales', icon: FileText, description: 'CGV, CGU, Confidentialité' },
      { id: 'settings', name: 'Paramètres', icon: Settings, description: 'Configuration de la plateforme' }
    ]
  }
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV.flatMap(c => c.items);

export const pathForItem = (id: string) => (id === 'dashboard' ? '/admin' : `/admin/${id}`);

export const categoryBadgeCount = (category: AdminNavCategory, counts: AdminCounts) =>
  category.items.reduce((acc, item) => acc + (item.badge ? counts[item.badge] : 0), 0);
