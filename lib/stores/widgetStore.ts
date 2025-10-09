import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PersistStorage, StorageValue } from 'zustand/middleware';
import { features } from '@/lib/features';

export interface Widget {
  id: string;
  type:
    | 'price-info'
    | 'price-chart'
    | 'volume-info'
    | 'volume-chart'
    | 'sentiment'
    | 'forecast'
    | 'holders-info'
    | 'holders-chart'
    | 'distribution-info'
    | 'raydium-info'
    | 'stakers-unstakers-info'
    | 'staking-details'
    | 'staking-info'
    | 'blog-latest';
  visible: boolean;
  order: number;
  size?: 'half' | 'full';
}

interface WidgetStore {
  widgets: Widget[];
  advancedModeWidgets: Widget[];
  currentMode: 'simple' | 'advanced';
  setWidgets: (widgets: Widget[]) => void;
  toggleWidget: (id: string) => void;
  reorderWidgets: (draggedId: string, targetId: string) => void;
  moveWidgetUp: (id: string) => void;
  moveWidgetDown: (id: string) => void;
  resetWidgets: () => void;
  toggleWidgetSize: (id: string) => void;
  loadSimpleModeWidgets: () => void;
  saveAndLoadAdvancedMode: () => void;
}

const ADVANCED_WIDGET_STORAGE_KEY = 'nos-dashboard:advanced-widgets';
const LEGACY_WIDGET_STORAGE_KEY = 'nos-widgets';
const BLOG_WIDGET_ID = 'blog-latest-1';
const STORAGE_VERSION = 3;

const cloneWidgets = (widgets: Widget[]): Widget[] => widgets.map((widget) => ({ ...widget }));

const disabledWidgetTypes: Widget['type'][] = [];

if (!features.priceForecast) {
  disabledWidgetTypes.push('forecast');
}

const isWidgetEnabled = (widget: Widget): boolean => !disabledWidgetTypes.includes(widget.type);

const baseDefaultWidgets: Widget[] = [
  { id: 'price-info-1', type: 'price-info', visible: true, order: 0, size: 'full' },
  { id: 'price-chart-1', type: 'price-chart', visible: true, order: 1, size: 'half' },
  { id: 'volume-info-1', type: 'volume-info', visible: true, order: 2, size: 'full' },
  { id: 'holders-info-1', type: 'holders-info', visible: true, order: 3, size: 'full' },
  { id: 'holders-chart-1', type: 'holders-chart', visible: true, order: 4, size: 'half' },
  { id: 'volume-chart-1', type: 'volume-chart', visible: true, order: 5, size: 'half' },
  { id: 'staking-info-1', type: 'staking-info', visible: true, order: 6, size: 'full' },
  { id: 'raydium-info-1', type: 'raydium-info', visible: true, order: 7, size: 'full' },
  { id: 'distribution-info-1', type: 'distribution-info', visible: true, order: 8, size: 'full' },
  { id: 'staking-details-1', type: 'staking-details', visible: true, order: 9, size: 'full' },
  {
    id: 'stakers-unstakers-info-1',
    type: 'stakers-unstakers-info',
    visible: true,
    order: 10,
    size: 'full',
  },
  { id: 'forecast-1', type: 'forecast', visible: true, order: 11, size: 'full' },
  { id: 'sentiment-1', type: 'sentiment', visible: true, order: 12, size: 'full' },
  { id: BLOG_WIDGET_ID, type: 'blog-latest', visible: true, order: 13, size: 'half' },
];

const baseSimpleModeWidgets: Widget[] = [
  { id: 'price-info-1', type: 'price-info', visible: true, order: 0, size: 'full' },
  { id: 'price-chart-1', type: 'price-chart', visible: true, order: 1, size: 'full' },
  { id: 'volume-info-1', type: 'volume-info', visible: true, order: 2, size: 'full' },
  { id: 'sentiment-1', type: 'sentiment', visible: true, order: 3, size: 'full' },
  { id: 'holders-info-1', type: 'holders-info', visible: true, order: 4, size: 'full' },
  { id: 'staking-info-1', type: 'staking-info', visible: true, order: 5, size: 'full' },
  { id: 'distribution-info-1', type: 'distribution-info', visible: true, order: 6, size: 'full' },
];

const defaultWidgets = baseDefaultWidgets.filter(isWidgetEnabled);
const simpleModeWidgets = baseSimpleModeWidgets.filter(isWidgetEnabled);

const safeLocalStorage: PersistStorage<WidgetStore> = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    let raw = window.localStorage.getItem(name);

    if (!raw && name === ADVANCED_WIDGET_STORAGE_KEY) {
      raw = window.localStorage.getItem(LEGACY_WIDGET_STORAGE_KEY);
      if (raw) {
        window.localStorage.setItem(name, raw);
        window.localStorage.removeItem(LEGACY_WIDGET_STORAGE_KEY);
      }
    }

    if (!raw) return null;
    try {
      return JSON.parse(raw) as StorageValue<WidgetStore>;
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

const mergeWithDefaultWidgets = (widgets: Widget[]): Widget[] => {
  const enabledWidgets = widgets.filter(isWidgetEnabled);
  const existingById = new Map(enabledWidgets.map((widget) => [widget.id, { ...widget }]));
  const merged: Widget[] = defaultWidgets.map((defaultWidget) => {
    const existing = existingById.get(defaultWidget.id);
    if (existing) {
      return {
        ...defaultWidget,
        ...existing,
        order: existing.order ?? defaultWidget.order,
      };
    }
    return { ...defaultWidget };
  });

  const defaultIds = new Set(defaultWidgets.map((widget) => widget.id));
  enabledWidgets.forEach((widget) => {
    if (!defaultIds.has(widget.id)) {
      merged.push({ ...widget });
    }
  });

  return merged
    .sort((a, b) => a.order - b.order)
    .map((widget, index) => ({ ...widget, order: index }));
};

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set) => ({
      widgets: mergeWithDefaultWidgets(defaultWidgets),
      advancedModeWidgets: mergeWithDefaultWidgets(defaultWidgets),
      currentMode: 'advanced',

      setWidgets: (widgets) =>
        set((state) => {
          const cloned = cloneWidgets(widgets);
          if (state.currentMode === 'advanced') {
            return {
              widgets: mergeWithDefaultWidgets(cloned),
              advancedModeWidgets: mergeWithDefaultWidgets(cloned),
            };
          }
          return { widgets: cloned };
        }),

      toggleWidget: (id) =>
        set((state) => {
          const updatedWidgets = state.widgets.map((w) =>
            w.id === id ? { ...w, visible: !w.visible } : w,
          );
          return {
            widgets: updatedWidgets,
            ...(state.currentMode === 'advanced' && {
              advancedModeWidgets: mergeWithDefaultWidgets(updatedWidgets),
            }),
          };
        }),

      toggleWidgetSize: (id) =>
        set((state) => {
          const updatedWidgets: Widget[] = state.widgets.map((w): Widget => {
            if (w.id !== id) return w;
            const newSize: Widget['size'] = w.size === 'full' ? 'half' : 'full';
            return { ...w, size: newSize } as Widget;
          });
          return {
            widgets: updatedWidgets,
            ...(state.currentMode === 'advanced' && {
              advancedModeWidgets: mergeWithDefaultWidgets(updatedWidgets),
            }),
          };
        }),

      reorderWidgets: (draggedId, targetId) =>
        set((state) => {
          const widgets = [...state.widgets];
          const draggedIndex = widgets.findIndex((w) => w.id === draggedId);
          const targetIndex = widgets.findIndex((w) => w.id === targetId);

          if (draggedIndex === -1 || targetIndex === -1) return state;

          [widgets[draggedIndex], widgets[targetIndex]] = [
            widgets[targetIndex],
            widgets[draggedIndex],
          ];

          widgets.forEach((w, i) => (w.order = i));

          return {
            widgets,
            ...(state.currentMode === 'advanced' && {
              advancedModeWidgets: mergeWithDefaultWidgets(widgets),
            }),
          };
        }),

      moveWidgetUp: (id) =>
        set((state) => {
          const widgets = [...state.widgets];
          const visibleWidgets = widgets.filter((w) => w.visible).sort((a, b) => a.order - b.order);
          const currentIndex = visibleWidgets.findIndex((w) => w.id === id);

          if (currentIndex <= 0) return state;

          const currentWidget = visibleWidgets[currentIndex];
          const previousWidget = visibleWidgets[currentIndex - 1];

          const tempOrder = currentWidget.order;
          currentWidget.order = previousWidget.order;
          previousWidget.order = tempOrder;

          return {
            widgets,
            ...(state.currentMode === 'advanced' && {
              advancedModeWidgets: mergeWithDefaultWidgets(widgets),
            }),
          };
        }),

      moveWidgetDown: (id) =>
        set((state) => {
          const widgets = [...state.widgets];
          const visibleWidgets = widgets.filter((w) => w.visible).sort((a, b) => a.order - b.order);
          const currentIndex = visibleWidgets.findIndex((w) => w.id === id);

          if (currentIndex === -1 || currentIndex >= visibleWidgets.length - 1) return state;

          const currentWidget = visibleWidgets[currentIndex];
          const nextWidget = visibleWidgets[currentIndex + 1];

          const tempOrder = currentWidget.order;
          currentWidget.order = nextWidget.order;
          nextWidget.order = tempOrder;

          return {
            widgets,
            ...(state.currentMode === 'advanced' && {
              advancedModeWidgets: mergeWithDefaultWidgets(widgets),
            }),
          };
        }),

      resetWidgets: () =>
        set((state) => {
          const reset = mergeWithDefaultWidgets(defaultWidgets);
          return {
            widgets: reset,
            ...(state.currentMode === 'advanced' && {
              advancedModeWidgets: mergeWithDefaultWidgets(reset),
            }),
          };
        }),

      loadSimpleModeWidgets: () =>
        set((state) => {
          const shouldCaptureAdvanced = state.currentMode === 'advanced';
          const preservedAdvanced = shouldCaptureAdvanced
            ? mergeWithDefaultWidgets(state.widgets)
            : state.advancedModeWidgets.length
              ? mergeWithDefaultWidgets(state.advancedModeWidgets)
              : mergeWithDefaultWidgets(defaultWidgets);

          return {
            widgets: cloneWidgets(simpleModeWidgets),
            advancedModeWidgets: preservedAdvanced,
            currentMode: 'simple',
          };
        }),

      saveAndLoadAdvancedMode: () =>
        set((state) => {
          const advancedWidgets = state.advancedModeWidgets.length
            ? mergeWithDefaultWidgets(state.advancedModeWidgets)
            : mergeWithDefaultWidgets(defaultWidgets);
          return {
            widgets: advancedWidgets,
            advancedModeWidgets: mergeWithDefaultWidgets(advancedWidgets),
            currentMode: 'advanced',
          };
        }),
    }),
    {
      name: ADVANCED_WIDGET_STORAGE_KEY,
      storage: safeLocalStorage as unknown as PersistStorage<unknown>,
      version: STORAGE_VERSION,
      migrate: (persistedState: unknown, version) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState;
        }

        const snapshot = persistedState as {
          state?: {
            currentMode?: string;
            widgets?: Widget[] | undefined;
            advancedModeWidgets?: Widget[] | undefined;
            [key: string]: unknown;
          };
        };

        if (snapshot.state) {
          if (!snapshot.state.currentMode) {
            snapshot.state.currentMode = 'advanced';
          }

          const shouldForceBlogVisible = version < 2;
          const normalize = (widgets: Widget[] | undefined): Widget[] => {
            const source = Array.isArray(widgets) && widgets.length ? widgets : defaultWidgets;
            const merged = mergeWithDefaultWidgets(source);

            return merged.map((widget) => {
              if (widget.id !== BLOG_WIDGET_ID) return widget;

              return {
                ...widget,
                visible: shouldForceBlogVisible ? true : widget.visible,
                size: widget.size ?? 'half',
              };
            });
          };

          snapshot.state.widgets = normalize(snapshot.state.widgets);
          snapshot.state.advancedModeWidgets = normalize(snapshot.state.advancedModeWidgets);
        }
        return snapshot;
      },
    },
  ),
);
