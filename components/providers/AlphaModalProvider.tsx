'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { AlphaModal } from '@/components/ui/AlphaModal';

interface AlphaModalContextType {
  showModal: () => void;
}

const AlphaModalContext = createContext<AlphaModalContextType | undefined>(undefined);

export function useAlphaModal() {
  const context = useContext(AlphaModalContext);
  if (!context) {
    throw new Error('useAlphaModal must be used within AlphaModalProvider');
  }
  return context;
}

interface AlphaModalProviderProps {
  children: ReactNode;
}

export function AlphaModalProvider({ children }: AlphaModalProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const showModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <AlphaModalContext.Provider value={{ showModal }}>
      {children}
      <AlphaModal isOpen={isOpen} onClose={closeModal} />
    </AlphaModalContext.Provider>
  );
}
