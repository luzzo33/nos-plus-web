'use client';

import { useState, useEffect } from 'react';
import { Type, Plus, Minus, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';

export function FontScaleControls() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { scale, setScale } = useFontScale();
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const currentDevice = isMobile ? 'mobile' : 'desktop';
  const currentScale = scale[currentDevice];

  const adjustSize = (increase: boolean) => {
    const newValue = increase ? Math.min(currentScale + 5, 150) : Math.max(currentScale - 5, 50);
    setScale(currentDevice as 'mobile' | 'desktop', newValue);
  };

  const resetSize = () => {
    setScale(currentDevice as 'mobile' | 'desktop', isMobile ? 110 : 100);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-110"
        title="Font Size Settings"
      >
        <Type className="w-5 h-5" />
      </button>
      {/* Controls Panel */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 bg-card border border-border rounded-lg shadow-xl p-4 min-w-[200px]">
          <h4 className="text-sm font-medium mb-3">Font Size</h4>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{currentScale}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => adjustSize(false)}
                  className="p-1 rounded hover:bg-secondary transition-colors"
                  disabled={currentScale <= 50}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <div className="flex-1 h-1.5 bg-secondary rounded-full relative">
                  <div
                    className="absolute h-full bg-primary rounded-full transition-all"
                    style={{ width: `${((currentScale - 50) / 100) * 100}%` }}
                  />
                </div>
                <button
                  onClick={() => adjustSize(true)}
                  className="p-1 rounded hover:bg-secondary transition-colors"
                  disabled={currentScale >= 150}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
            <button
              onClick={resetSize}
              className="w-full px-3 py-1.5 text-xs bg-secondary rounded hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3 h-3" />
              Reset to Default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
