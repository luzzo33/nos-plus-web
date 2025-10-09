'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const DEFAULT_FONT_SCALE = { desktop: 100, mobile: 110 } as const;

const baseFontSizes = {
  '3xs': { base: 10 },
  '2xs': { base: 11 },
  xs: { base: 12 },
  sm: { base: 14 },
  base: { base: 16 },
  lg: { base: 18 },
  xl: { base: 20 },
  '2xl': { base: 24 },
  '3xl': { base: 30 },
  '4xl': { base: 36 },
  '5xl': { base: 48 },
} as const;
type FontSize = keyof typeof baseFontSizes;

interface FontScaleContextValue {
  text: (mobileSize: FontSize, desktopSize: FontSize, additionalClasses?: string) => string;
  scale: { mobile: number; desktop: number };
  setScale: (device: 'mobile' | 'desktop', percentage: number) => void;
}

const FontScaleContext = createContext<FontScaleContextValue | undefined>(undefined);

export function FontScaleProvider({
  children,
  initialScale = DEFAULT_FONT_SCALE,
}: {
  children: ReactNode;
  initialScale?: typeof DEFAULT_FONT_SCALE;
}) {
  const [scale, setScaleState] = useState(initialScale);
  const setScale = (device: 'mobile' | 'desktop', percentage: number) =>
    setScaleState((prev) => ({ ...prev, [device]: percentage }));
  const text = (mobileSize: FontSize, desktopSize: FontSize, additionalClasses?: string) => {
    const className = `fs-${mobileSize}-${desktopSize}`;
    return cn(className, additionalClasses);
  };
  useEffect(() => {
    const styleId = 'font-scale-styles-raydium';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    const styles = Object.entries(baseFontSizes)
      .flatMap(([mKey, mVal]) =>
        Object.entries(baseFontSizes).map(([dKey, dVal]) => {
          const mobilePixels = Math.round((mVal as any).base * (scale.mobile / 100));
          const desktopPixels = Math.round((dVal as any).base * (scale.desktop / 100));
          return `
        .fs-${mKey}-${dKey} { font-size: ${mobilePixels}px; }
        @media (min-width: 768px) { .fs-${mKey}-${dKey} { font-size: ${desktopPixels}px; } }
      `;
        }),
      )
      .join('\n');
    styleEl.textContent = styles;
  }, [scale]);
  return (
    <FontScaleContext.Provider value={{ text, scale, setScale }}>
      {children}
    </FontScaleContext.Provider>
  );
}

export function useFontScale() {
  const context = useContext(FontScaleContext);
  if (!context) throw new Error('useFontScale must be used within FontScaleProvider');
  return context;
}

export const FONT_SCALE = {
  desktop: DEFAULT_FONT_SCALE.desktop / 100,
  mobile: DEFAULT_FONT_SCALE.mobile / 100,
};

export function useDynamicFontScale() {
  const { scale, setScale } = useFontScale();
  const increaseFontSize = (percentage = 10) => {
    setScale('mobile', Math.min(scale.mobile + percentage, 150));
    setScale('desktop', Math.min(scale.desktop + percentage, 150));
  };
  const decreaseFontSize = (percentage = 10) => {
    setScale('mobile', Math.max(scale.mobile - percentage, 50));
    setScale('desktop', Math.max(scale.desktop - percentage, 50));
  };
  const resetFontSize = () => {
    setScale('mobile', 110);
    setScale('desktop', 100);
  };
  return { scale, increaseFontSize, decreaseFontSize, resetFontSize };
}
