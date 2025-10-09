'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, GripVertical, Maximize, Minimize, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveMetricsChart } from './LiveMetricsChart';
import { MobileChartPager } from './MobileChartPager';
import { LiveFeedVirtualized } from './LiveFeedVirtualized';
import { ProfessionalOrderBook } from './ProfessionalOrderBook';
import { PlansSection } from './PlansSection';
import { DesktopChartSwitcher } from './DesktopChartSwitcher';
import { StatsSummaryCard } from './StatsSummaryCard';

type Range = '15m' | '1h' | '6h' | '1d';
interface LayoutComponent {
  id: string;
  type:
    | 'price-chart'
    | 'volume-chart'
    | 'activity-chart'
    | 'mobile-charts'
    | 'chart-switcher'
    | 'stats-summary'
    | 'live-feed'
    | 'order-book'
    | 'dca-section';
  title: string;
  visible: boolean;
  order: number;
  size: 'full' | 'half' | 'third';
  desktopOnly?: boolean;
  gridArea?: string;
}

const LAYOUT_PRESETS = {
  default: [
    {
      id: 'mobile-charts',
      type: 'mobile-charts' as const,
      title: 'Mobile Charts',
      visible: true,
      order: 0,
      size: 'full' as const,
    },
    {
      id: 'chart-switcher',
      type: 'chart-switcher' as const,
      title: 'Charts',
      visible: true,
      order: 1,
      size: 'half' as const,
      desktopOnly: true,
    },
    {
      id: 'stats-summary',
      type: 'stats-summary' as const,
      title: 'Stats Summary',
      visible: true,
      order: 2,
      size: 'half' as const,
    },
    {
      id: 'live-feed',
      type: 'live-feed' as const,
      title: 'Live Feed',
      visible: true,
      order: 3,
      size: 'full' as const,
    },
    {
      id: 'order-book',
      type: 'order-book' as const,
      title: 'Order Book',
      visible: true,
      order: 4,
      size: 'half' as const,
    },
    {
      id: 'dca-section',
      type: 'dca-section' as const,
      title: 'DCA Section',
      visible: true,
      order: 5,
      size: 'half' as const,
    },
  ],
  chartsFirst: [
    {
      id: 'mobile-charts',
      type: 'mobile-charts' as const,
      title: 'Mobile Charts',
      visible: true,
      order: 0,
      size: 'full' as const,
    },
    {
      id: 'chart-switcher',
      type: 'chart-switcher' as const,
      title: 'Charts',
      visible: true,
      order: 1,
      size: 'full' as const,
      desktopOnly: true,
    },
    {
      id: 'stats-summary',
      type: 'stats-summary' as const,
      title: 'Stats Summary',
      visible: true,
      order: 2,
      size: 'full' as const,
    },
    {
      id: 'live-feed',
      type: 'live-feed' as const,
      title: 'Live Feed',
      visible: true,
      order: 3,
      size: 'half' as const,
    },
    {
      id: 'order-book',
      type: 'order-book' as const,
      title: 'Order Book',
      visible: true,
      order: 4,
      size: 'half' as const,
    },
    {
      id: 'dca-section',
      type: 'dca-section' as const,
      title: 'DCA Section',
      visible: true,
      order: 5,
      size: 'full' as const,
    },
  ],
  dataFocus: [
    {
      id: 'mobile-charts',
      type: 'mobile-charts' as const,
      title: 'Mobile Charts',
      visible: true,
      order: 0,
      size: 'full' as const,
    },
    {
      id: 'live-feed',
      type: 'live-feed' as const,
      title: 'Live Feed',
      visible: true,
      order: 1,
      size: 'full' as const,
    },
    {
      id: 'order-book',
      type: 'order-book' as const,
      title: 'Order Book',
      visible: true,
      order: 2,
      size: 'full' as const,
    },
    {
      id: 'dca-section',
      type: 'dca-section' as const,
      title: 'DCA Section',
      visible: true,
      order: 3,
      size: 'full' as const,
    },
    {
      id: 'chart-switcher',
      type: 'chart-switcher' as const,
      title: 'Charts',
      visible: true,
      order: 4,
      size: 'half' as const,
      desktopOnly: true,
    },
    {
      id: 'stats-summary',
      type: 'stats-summary' as const,
      title: 'Stats Summary',
      visible: true,
      order: 5,
      size: 'half' as const,
    },
  ],
  minimal: [
    {
      id: 'mobile-charts',
      type: 'mobile-charts' as const,
      title: 'Mobile Charts',
      visible: true,
      order: 0,
      size: 'full' as const,
    },
    {
      id: 'chart-switcher',
      type: 'chart-switcher' as const,
      title: 'Charts',
      visible: true,
      order: 1,
      size: 'full' as const,
      desktopOnly: true,
    },
    {
      id: 'live-feed',
      type: 'live-feed' as const,
      title: 'Live Feed',
      visible: true,
      order: 2,
      size: 'half' as const,
    },
    {
      id: 'order-book',
      type: 'order-book' as const,
      title: 'Order Book',
      visible: true,
      order: 3,
      size: 'half' as const,
    },
    {
      id: 'stats-summary',
      type: 'stats-summary' as const,
      title: 'Stats Summary',
      visible: false,
      order: 4,
      size: 'half' as const,
    },
    {
      id: 'dca-section',
      type: 'dca-section' as const,
      title: 'DCA Section',
      visible: false,
      order: 5,
      size: 'full' as const,
    },
  ],
};

const DEFAULT_COMPONENTS = LAYOUT_PRESETS.default;

function ComponentRenderer({ component, range }: { component: LayoutComponent; range: Range }) {
  const getComponentHeight = () => {
    if (component.type === 'live-feed') {
      return component.size === 'half' ? 420 : 650;
    }
    if (component.type === 'order-book') {
      return undefined;
    }
    if (component.type === 'dca-section') {
      return undefined;
    }
    return undefined;
  };

  const height = getComponentHeight();

  switch (component.type) {
    case 'mobile-charts':
      return <MobileChartPager range={range} />;
    case 'chart-switcher':
      return <DesktopChartSwitcher range={range} />;
    case 'stats-summary':
      return <StatsSummaryCard />;
    case 'price-chart':
      return <LiveMetricsChart metric="price" range={range} />;
    case 'volume-chart':
      return <LiveMetricsChart metric="volume" range={range} />;
    case 'activity-chart':
      return <LiveMetricsChart metric="activity" range={range} />;
    case 'live-feed':
      return <LiveFeedVirtualized height={height || 480} />;
    case 'order-book':
      return <ProfessionalOrderBook />;
    case 'dca-section':
      return <PlansSection />;
    default:
      return <div className="p-4 text-center text-muted-foreground">Unknown component</div>;
  }
}

export function TechnicalLayoutEditor({ range, editMode }: { range: Range; editMode: boolean }) {
  const [components, setComponents] = useState<LayoutComponent[]>(DEFAULT_COMPONENTS);
  const [isMobile, setIsMobile] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const [draggedComponent, setDraggedComponent] = useState<string | null>(null);
  const [dragOverComponent, setDragOverComponent] = useState<string | null>(null);
  const dragCounter = useRef(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPresets && !(event.target as Element).closest('.preset-dropdown')) {
        setShowPresets(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPresets]);

  const saveLayout = useCallback(() => {
    try {
      localStorage.setItem('monitor:technical-layout', JSON.stringify(components));
    } catch {}
  }, [components]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('monitor:technical-layout');
      if (saved) {
        setComponents(JSON.parse(saved));
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleApplyPreset = (event: CustomEvent) => {
      const presetKey = event.detail as keyof typeof LAYOUT_PRESETS;
      if (LAYOUT_PRESETS[presetKey]) {
        setComponents([...LAYOUT_PRESETS[presetKey]]);
      }
    };

    const handleSaveLayout = () => {
      saveLayout();
    };

    window.addEventListener('applyPreset', handleApplyPreset as EventListener);
    window.addEventListener('saveLayout', handleSaveLayout);
    return () => {
      window.removeEventListener('applyPreset', handleApplyPreset as EventListener);
      window.removeEventListener('saveLayout', handleSaveLayout);
    };
  }, [saveLayout]);

  const visibleComponents = components
    .filter((c) => c.visible)
    .filter((c) => !isMobile || !c.desktopOnly)
    .sort((a, b) => a.order - b.order);

  const resetLayout = useCallback(() => {
    if (confirm('Reset to default layout? This will lose your current customizations.')) {
      setComponents(DEFAULT_COMPONENTS);
    }
  }, []);

  const applyPreset = useCallback((presetKey: keyof typeof LAYOUT_PRESETS) => {
    const preset = LAYOUT_PRESETS[presetKey];
    setComponents([...preset]);
    setShowPresets(false);
  }, []);

  const toggleComponentSize = useCallback((componentId: string) => {
    setComponents((prev) =>
      prev.map((comp) => {
        if (comp.id === componentId) {
          let newSize: 'full' | 'half' | 'third';
          switch (comp.size) {
            case 'full':
              newSize = 'half';
              break;
            case 'half':
              newSize = 'third';
              break;
            case 'third':
              newSize = 'full';
              break;
            default:
              newSize = 'half';
          }
          return { ...comp, size: newSize };
        }
        return comp;
      }),
    );
  }, []);

  const reorderComponents = useCallback((draggedId: string, targetId: string) => {
    setComponents((prev) => {
      const components = [...prev];
      const draggedIndex = components.findIndex((c) => c.id === draggedId);
      const targetIndex = components.findIndex((c) => c.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return prev;

      [components[draggedIndex], components[targetIndex]] = [
        components[targetIndex],
        components[draggedIndex],
      ];

      components.forEach((c, i) => (c.order = i));

      return components;
    });
  }, []);

  const handleDragStart = useCallback((e: any, id: string) => {
    setDraggedComponent(id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnter = useCallback(
    (e: React.DragEvent, id: string) => {
      e.preventDefault();
      dragCounter.current++;
      if (draggedComponent && draggedComponent !== id) setDragOverComponent(id);
    },
    [draggedComponent],
  );

  const handleDragLeave = useCallback(() => {
    dragCounter.current--;
    if (dragCounter.current === 0) setDragOverComponent(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      dragCounter.current = 0;
      if (draggedComponent && draggedComponent !== targetId) {
        reorderComponents(draggedComponent, targetId);
      }
      setDraggedComponent(null);
      setDragOverComponent(null);
    },
    [draggedComponent, reorderComponents],
  );

  const handleDragEnd = useCallback(() => {
    dragCounter.current = 0;
    setDraggedComponent(null);
    setDragOverComponent(null);
  }, []);

  const renderComponent = (component: LayoutComponent) => {
    const isChart = component.type.includes('chart');
    const canResize = component.type !== 'mobile-charts';
    const beingDragged = draggedComponent === component.id;
    const draggedOver = dragOverComponent === component.id;

    const getColSpan = () => {
      if (isMobile) return 'col-span-1';
      switch (component.size) {
        case 'full':
          return 'col-span-6';
        case 'half':
          return 'col-span-3';
        case 'third':
          return 'col-span-2';
        default:
          return 'col-span-3';
      }
    };

    if (editMode) {
      return (
        <motion.div
          key={component.id}
          layout
          layoutId={component.id}
          data-component-id={component.id}
          className={cn(
            'relative group',
            getColSpan(),
            beingDragged && 'opacity-50',
            draggedOver && 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg',
            component.type === 'mobile-charts' && 'md:hidden',
          )}
          draggable={!isMobile && editMode}
          onDragStart={(e) => handleDragStart(e, component.id)}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, component.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, component.id)}
          onDragEnd={handleDragEnd}
          style={{
            cursor: editMode && !isMobile ? 'grab' : undefined,
          }}
          transition={{ layout: { type: 'spring', stiffness: 350, damping: 30 } }}
        >
          {/* Desktop drag handle */}
          <motion.div
            className="absolute -top-2 -right-2 z-10 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={!isMobile ? { scale: 1.1 } : {}}
          >
            <GripVertical className="w-3 h-3" />
          </motion.div>

          {/* Desktop size toggle button for all resizable components */}
          {canResize && !isMobile && (
            <motion.button
              onClick={() => toggleComponentSize(component.id)}
              className="absolute -top-2 -left-2 z-10 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              title={`Resize Component (${component.size})`}
            >
              {component.size === 'full' ? (
                <Minimize className="w-3 h-3" />
              ) : (
                <Maximize className="w-3 h-3" />
              )}
            </motion.button>
          )}

          <div
            className={cn(
              'h-full overflow-hidden',
              editMode &&
                'ring-2 ring-primary/20 ring-offset-2 ring-offset-background rounded-xl pointer-events-none',
            )}
          >
            <ComponentRenderer component={component} range={range} />
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={component.id}
        layout
        layoutId={component.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{
          layout: { type: 'spring', stiffness: 350, damping: 30 },
          opacity: { duration: 0.2 },
          scale: { duration: 0.2 },
        }}
        className={cn(getColSpan(), 'h-full', component.type === 'mobile-charts' && 'md:hidden')}
      >
        <ComponentRenderer component={component} range={range} />
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Edit Mode Controls */}
      {editMode && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-sm">
                <span className="font-medium">Layout Editor:</span>{' '}
                {isMobile ? 'Tap arrows to reorder • ' : 'Drag to reorder • '}
                Click resize buttons to change component sizes
              </p>
            </div>
            <button
              onClick={resetLayout}
              className="flex items-center gap-2 px-3 py-1 bg-muted text-foreground rounded hover:bg-muted/80 transition-colors text-sm"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        </motion.div>
      )}

      {/* Component Grid */}
      <div
        className={cn(
          'grid',
          isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-6 gap-6',
          'auto-rows-[minmax(300px,auto)] min-h-0',
        )}
      >
        <AnimatePresence mode="popLayout">
          {visibleComponents.map((component) => renderComponent(component))}
        </AnimatePresence>
      </div>
    </div>
  );
}
