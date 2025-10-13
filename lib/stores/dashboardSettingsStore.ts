'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PersistStorage, StorageValue } from 'zustand/middleware';

export type TimeDisplayMode = 'absolute' | 'relative';
export type DashboardMode = 'simple' | 'advanced';
export type SimplePreset = 'perspective';

interface DashboardSettingsState {
  timeDisplayMode: TimeDisplayMode;
  dashboardMode: DashboardMode;
  simplePreset: SimplePreset;
  hideAdvancedModeWarning: boolean;
  advancedTooltips: boolean;
  setTimeDisplayMode: (mode: TimeDisplayMode) => void;
  setDashboardMode: (mode: DashboardMode) => void;
  setSimplePreset: (preset?: SimplePreset) => void;
  setHideAdvancedModeWarning: (hide: boolean) => void;
  setAdvancedTooltips: (enabled: boolean) => void;
}

const safeLocalStorage: PersistStorage<DashboardSettingsState> = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(name);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StorageValue<DashboardSettingsState>;
    } catch {
      window.localStorage.removeItem(name);
      return null;
    }
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(name);
  },
};

export const useDashboardSettingsStore = create<DashboardSettingsState>()(
  persist(
    (set) => ({
      timeDisplayMode: 'absolute',
      dashboardMode: 'simple',
      simplePreset: 'perspective',
      hideAdvancedModeWarning: false,
      advancedTooltips: false,
      setTimeDisplayMode: (mode) => set({ timeDisplayMode: mode }),
      setDashboardMode: (mode) => set({ dashboardMode: mode }),
      setSimplePreset: () => set({ simplePreset: 'perspective' }),
      setHideAdvancedModeWarning: (hide) => set({ hideAdvancedModeWarning: hide }),
      setAdvancedTooltips: (enabled) => set({ advancedTooltips: enabled }),
    }),
    {
      name: 'nos-dashboard-settings',
      version: 4,
      storage: safeLocalStorage,
      migrate: (persistedState) => {
        if (persistedState?.state?.simplePreset === 'balanced') {
          persistedState.state.simplePreset = 'perspective';
        }
        if (persistedState?.state && typeof persistedState.state.advancedTooltips !== 'boolean') {
          persistedState.state.advancedTooltips = false;
        }
        return persistedState;
      },
    },
  ),
);
