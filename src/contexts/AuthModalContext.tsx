import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type AuthModalContextType = {
  isOpen: boolean;
  openModal: (initialView?: 'login' | 'signup') => void;
  closeModal: () => void;
  defaultView: 'login' | 'signup';
};

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [defaultView, setDefaultView] = useState<'login' | 'signup'>('login');

  const openModal = (view: 'login' | 'signup' = 'login') => {
    setDefaultView(view);
    setIsOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setIsOpen(false);
    document.body.style.overflow = 'auto';
  };

  return (
    <AuthModalContext.Provider value={{ isOpen, openModal, closeModal, defaultView }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}
