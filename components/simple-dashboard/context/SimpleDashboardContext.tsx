'use client';

import { createContext, useState, useMemo, type ReactNode, useContext, useCallback } from 'react';
import {
  type LayoutPreset,
  type SimpleDensity,
  type SimpleSectionKey,
  DEFAULT_PRESET,
  DEFAULT_DENSITY,
} from '@/components/simple-dashboard/state/presets';

interface SimpleDashboardContextValue {
  preset: LayoutPreset;
  setPreset: (preset: LayoutPreset) => void;
  density: SimpleDensity;
  setDensity: (density: SimpleDensity) => void;
  toggleDensity: () => void;
  activeSection: SimpleSectionKey | null;
  setActiveSection: (section: SimpleSectionKey | null) => void;
}

const SimpleDashboardContext = createContext<SimpleDashboardContextValue | null>(null);

export function SimpleDashboardProvider({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState<LayoutPreset>(DEFAULT_PRESET);
  const [density, setDensity] = useState<SimpleDensity>(DEFAULT_DENSITY);
  const [activeSection, setActiveSection] = useState<SimpleSectionKey | null>(null);

  const toggleDensity = useCallback(() => {
    setDensity((prev) => (prev === 'compact' ? 'comfort' : 'compact'));
  }, []);

  const value = useMemo(
    () => ({
      preset,
      setPreset,
      density,
      setDensity,
      toggleDensity,
      activeSection,
      setActiveSection,
    }),
    [preset, density, toggleDensity, activeSection],
  );

  return (
    <SimpleDashboardContext.Provider value={value}>{children}</SimpleDashboardContext.Provider>
  );
}

export function useSimpleDashboardContext(): SimpleDashboardContextValue {
  const ctx = useContext(SimpleDashboardContext);
  if (!ctx) {
    throw new Error('useSimpleDashboardContext must be used within SimpleDashboardProvider');
  }
  return ctx;
}
