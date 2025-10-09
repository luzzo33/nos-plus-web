'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const DEFAULT_FONT_SCALE = {
  desktop: 100,
  mobile: 110,
};

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
} as const;

type FontSize = keyof typeof baseFontSizes;

interface FontScaleContextValue {
  text: (mobileSize: FontSize, desktopSize: FontSize, additionalClasses?: string) => string;
  scale: {
    mobile: number;
    desktop: number;
  };
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

  const setScale = (device: 'mobile' | 'desktop', percentage: number) => {
    setScaleState((prev) => ({ ...prev, [device]: percentage }));
  };

  const text = (
    mobileSize: FontSize,
    desktopSize: FontSize,
    additionalClasses?: string,
  ): string => {
    const mobilePixels = baseFontSizes[mobileSize].base * (scale.mobile / 100);
    const desktopPixels = baseFontSizes[desktopSize].base * (scale.desktop / 100);

    const className = `fs-${mobileSize}-${desktopSize}`;

    return cn(className, additionalClasses);
  };

  useEffect(() => {
    const styleId = 'font-scale-styles';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const styles = Object.entries(baseFontSizes)
      .flatMap(([mobileKey, mobileValue]) =>
        Object.entries(baseFontSizes).map(([desktopKey, desktopValue]) => {
          const mobilePixels = Math.round(mobileValue.base * (scale.mobile / 100));
          const desktopPixels = Math.round(desktopValue.base * (scale.desktop / 100));

          return `
          .fs-${mobileKey}-${desktopKey} {
            font-size: ${mobilePixels}px;
          }
          @media (min-width: 768px) {
            .fs-${mobileKey}-${desktopKey} {
              font-size: ${desktopPixels}px;
            }
          }
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
  if (!context) {
    throw new Error('useFontScale must be used within FontScaleProvider');
  }
  return context;
}

export const FONT_SCALE = {
  desktop: DEFAULT_FONT_SCALE.desktop / 100,
  mobile: DEFAULT_FONT_SCALE.mobile / 100,
};

export function useDynamicFontScale() {
  const { scale, setScale } = useFontScale();

  const increaseFontSize = (percentage: number = 10) => {
    setScale('mobile', Math.min(scale.mobile + percentage, 150));
    setScale('desktop', Math.min(scale.desktop + percentage, 150));
  };

  const decreaseFontSize = (percentage: number = 10) => {
    setScale('mobile', Math.max(scale.mobile - percentage, 50));
    setScale('desktop', Math.max(scale.desktop - percentage, 50));
  };

  const resetFontSize = () => {
    setScale('mobile', DEFAULT_FONT_SCALE.mobile);
    setScale('desktop', DEFAULT_FONT_SCALE.desktop);
  };

  return {
    scale,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
  };
}
