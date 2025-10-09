'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, Reorder, useDragControls } from 'framer-motion';
import { X, Plus, Move, Resize, Grid3X3, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveMetricsChart } from './LiveMetricsChart';
import { LiveFeedVirtualized } from './LiveFeedVirtualized';
import { LiveSummaryPanel } from './LiveSummaryPanel';
import { ProfessionalOrderBook } from './ProfessionalOrderBook';
import { PlansSection } from './PlansSection';
import { TickerDetails } from './TickerDetails';
import { OrderWallHeatmap } from './OrderWallHeatmap';

type WidgetType =
  | 'price-chart'
  | 'volume-chart'
  | 'activity-chart'
  | 'live-feed'
  | 'order-book'
  | 'summary-panel'
  | 'ticker-details'
  | 'order-wall'
  | 'dca-section';

interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  props?: any;
}

interface DashboardEditorProps {
  onExit: () => void;
}

const WIDGET_LIBRARY: {
  type: WidgetType;
  title: string;
  icon: string;
  defaultSize: { width: number; height: number };
}[] = [
  {
    type: 'price-chart',
    title: 'Price Chart',
    icon: '📈',
    defaultSize: { width: 400, height: 300 },
  },
  {
    type: 'volume-chart',
    title: 'Volume Chart',
    icon: '📊',
    defaultSize: { width: 400, height: 300 },
  },
  {
    type: 'activity-chart',
    title: 'Activity Chart',
    icon: '⚡',
    defaultSize: { width: 400, height: 300 },
  },
  { type: 'live-feed', title: 'Live Feed', icon: '📡', defaultSize: { width: 300, height: 400 } },
  { type: 'order-book', title: 'Order Book', icon: '📋', defaultSize: { width: 300, height: 400 } },
  {
    type: 'summary-panel',
    title: 'Summary Panel',
    icon: '📊',
    defaultSize: { width: 600, height: 200 },
  },
  {
    type: 'ticker-details',
    title: 'Ticker Details',
    icon: '🎯',
    defaultSize: { width: 500, height: 250 },
  },
  {
    type: 'order-wall',
    title: 'Order Wall Heatmap',
    icon: '🔥',
    defaultSize: { width: 300, height: 250 },
  },
  {
    type: 'dca-section',
    title: 'DCA Section',
    icon: '💰',
    defaultSize: { width: 600, height: 300 },
  },
];

function WidgetRenderer({ widget }: { widget: DashboardWidget }) {
  const commonProps = {
    range: '15m' as const,
  };

  switch (widget.type) {
    case 'price-chart':
      return <LiveMetricsChart metric="price" {...commonProps} />;
    case 'volume-chart':
      return <LiveMetricsChart metric="volume" {...commonProps} />;
    case 'activity-chart':
      return <LiveMetricsChart metric="activity" {...commonProps} />;
    case 'live-feed':
      return <LiveFeedVirtualized height={widget.height - 40} />;
    case 'order-book':
      return <ProfessionalOrderBook />;
    case 'summary-panel':
      return <LiveSummaryPanel />;
    case 'ticker-details':
      return <TickerDetails />;
    case 'order-wall':
      return <OrderWallHeatmap />;
    case 'dca-section':
      return <PlansSection />;
    default:
      return <div className="p-4 text-center text-muted-foreground">Unknown widget</div>;
  }
}

function ResizableWidget({
  widget,
  onUpdate,
  onRemove,
  isSelected,
  onSelect,
}: {
  widget: DashboardWidget;
  onUpdate: (id: string, updates: Partial<DashboardWidget>) => void;
  onRemove: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    onSelect(widget.id);
  }, [widget.id, onSelect]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
    onSelect(widget.id);
  }, [widget.id, onSelect]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDrag={(_, info) => {
        onUpdate(widget.id, {
          x: Math.max(0, widget.x + info.delta.x),
          y: Math.max(0, widget.y + info.delta.y),
        });
      }}
      style={{
        position: 'absolute',
        left: widget.x,
        top: widget.y,
        width: widget.width,
        height: widget.height,
        zIndex: isDragging || isSelected ? 10 : 1,
      }}
      className={cn(
        'bg-card border border-border rounded-lg overflow-hidden',
        isSelected && 'ring-2 ring-primary',
        isDragging && 'shadow-lg',
      )}
      onClick={() => onSelect(widget.id)}
    >
      {/* Widget Header */}
      <div
        className="flex items-center justify-between p-2 bg-muted/50 border-b border-border cursor-move"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <div className="flex items-center gap-2">
          <Move className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{widget.title}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(widget.id);
          }}
          className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Widget Content */}
      <div className="h-full pb-8 overflow-hidden">
        <WidgetRenderer widget={widget} />
      </div>

      {/* Resize Handle */}
      {isSelected && (
        <motion.div
          ref={resizeRef}
          className="absolute bottom-0 right-0 w-4 h-4 bg-primary cursor-se-resize"
          style={{ clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)' }}
          drag
          dragMomentum={false}
          dragElastic={0}
          onDragStart={handleResizeStart}
          onDragEnd={handleResizeEnd}
          onDrag={(_, info) => {
            onUpdate(widget.id, {
              width: Math.max(200, widget.width + info.delta.x),
              height: Math.max(150, widget.height + info.delta.y),
            });
          }}
        >
          <Resize className="w-3 h-3 text-white absolute bottom-0 right-0" />
        </motion.div>
      )}
    </motion.div>
  );
}

export function DashboardEditor({ onExit }: DashboardEditorProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);

  const addWidget = useCallback((type: WidgetType) => {
    const libraryItem = WIDGET_LIBRARY.find((item) => item.type === type);
    if (!libraryItem) return;

    const newWidget: DashboardWidget = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title: libraryItem.title,
      x: Math.random() * 300,
      y: Math.random() * 200,
      width: libraryItem.defaultSize.width,
      height: libraryItem.defaultSize.height,
    };

    setWidgets((prev) => [...prev, newWidget]);
    setSelectedWidget(newWidget.id);
    setShowWidgetLibrary(false);
  }, []);

  const updateWidget = useCallback((id: string, updates: Partial<DashboardWidget>) => {
    setWidgets((prev) =>
      prev.map((widget) => (widget.id === id ? { ...widget, ...updates } : widget)),
    );
  }, []);

  const removeWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((widget) => widget.id !== id));
    setSelectedWidget(null);
  }, []);

  const saveDashboard = useCallback(() => {
    try {
      localStorage.setItem('monitor:dashboard', JSON.stringify(widgets));
      alert('Dashboard saved successfully!');
    } catch {
      alert('Failed to save dashboard');
    }
  }, [widgets]);

  const loadDashboard = useCallback(() => {
    try {
      const saved = localStorage.getItem('monitor:dashboard');
      if (saved) {
        setWidgets(JSON.parse(saved));
      }
    } catch {}
  }, []);

  useState(() => {
    loadDashboard();
  });

  return (
    <div className="relative h-screen bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Dashboard Editor</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowWidgetLibrary(!showWidgetLibrary)}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Widget
              </button>
              <button
                onClick={saveDashboard}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4" />
            Exit Editor
          </button>
        </div>
      </div>

      {/* Widget Library Sidebar */}
      {showWidgetLibrary && (
        <motion.div
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          exit={{ x: -300 }}
          className="absolute top-16 left-0 bottom-0 w-80 bg-card border-r border-border z-20 p-4 overflow-y-auto"
        >
          <h3 className="text-lg font-medium mb-4">Widget Library</h3>
          <div className="grid grid-cols-1 gap-3">
            {WIDGET_LIBRARY.map((item) => (
              <button
                key={item.type}
                onClick={() => addWidget(item.type)}
                className="flex items-center gap-3 p-3 text-left border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.defaultSize.width} × {item.defaultSize.height}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Dashboard Canvas */}
      <div
        className="absolute inset-0 pt-16 overflow-auto"
        style={{
          backgroundImage: `radial-gradient(circle, rgb(156 163 175 / 0.2) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
        onClick={() => setSelectedWidget(null)}
      >
        <div className="relative min-h-full min-w-full">
          {widgets.map((widget) => (
            <ResizableWidget
              key={widget.id}
              widget={widget}
              onUpdate={updateWidget}
              onRemove={removeWidget}
              isSelected={selectedWidget === widget.id}
              onSelect={setSelectedWidget}
            />
          ))}

          {widgets.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <Grid3X3 className="w-12 h-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-lg font-medium text-foreground">Empty Dashboard</p>
                  <p className="text-sm text-muted-foreground">
                    Click "Add Widget" to start building your dashboard
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
