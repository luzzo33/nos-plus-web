// components/dashboard/Dashboard.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  RefreshCw,
  Edit2,
  Check,
  Info,
  GripVertical,
  Move,
  Maximize,
  Minimize,
  ChevronUp,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { PriceInfoWidget, PriceChartWidget } from '@/components/widgets/PriceWidgets';
import { VolumeInfoWidget, VolumeChartWidget } from '@/components/widgets/VolumeWidgets';
import { SentimentWidget } from '@/components/widgets/SentimentWidget';
import { ForecastWidget } from '@/components/widgets/ForecastWidget';
import { HoldersInfoWidget, HoldersChartWidget } from '@/components/widgets/HoldersWidgets';
import { DistributionWidget } from '@/components/widgets/DistributionWidget';
import { BlogWidget } from '@/components/widgets/BlogWidget';
import { RaydiumWidget } from '@/components/widgets/RaydiumWidget';
import { StakersUnstakersWidget } from '@/components/widgets/StakersUnstakersWidget';
import { StakingDetailsWidget } from '@/components/widgets/StakingDetailsWidget';
import { StakingWidget } from '@/components/widgets/StakingWidget';
import { useToast } from '@/components/ui/Toast';
import { SettingsModal } from '@/components/dashboard/SettingsModal';
import { MobileReorderModal } from '@/components/dashboard/MobileReorderModal';
import { useQueryClient } from '@tanstack/react-query';
import { useWidgetStore } from '@/lib/stores/widgetStore';
import { useDashboardSettingsStore } from '@/lib/stores/dashboardSettingsStore';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { features } from '@/lib/features';

export function Dashboard() {
  const t = useTranslations('dashboard');
  const forecastEnabled = features.priceForecast;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    widgets,
    reorderWidgets,
    toggleWidgetSize,
    moveWidgetUp,
    moveWidgetDown,
    saveAndLoadAdvancedMode,
  } = useWidgetStore();
  const [isMobile, setIsMobile] = useState(false);
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // Desktop drag state
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<string | null>(null);
  const dragCounter = useRef(0);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load advanced widgets by default (advanced-only mode)
  useEffect(() => {
    saveAndLoadAdvancedMode();
  }, [saveAndLoadAdvancedMode]);

  const visibleWidgets = widgets
    .filter((w) => (forecastEnabled ? true : w.type !== 'forecast'))
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries();
      await new Promise((r) => setTimeout(r, 1000));
      addToast({
        type: 'success',
        title: t('refreshSuccessTitle'),
        description: t('refreshSuccessDesc'),
      });
    } catch {
      addToast({
        type: 'error',
        title: t('refreshFailedTitle'),
        description: t('refreshFailedDesc'),
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleEditMode = () => {
    setEditMode((prev) => !prev);
    if (!editMode) {
      addToast({
        type: 'info',
        title: t('editModeTitle'),
        description: isMobile ? t('editModeDescMobile') : t('editModeDesc'),
      });
    } else {
      addToast({
        type: 'success',
        title: t('layoutSavedTitle'),
        description: t('layoutSavedDesc'),
      });
    }
  };

  // Desktop drag/drop handlers
  const handleDragStart = useCallback((e: any, id: string) => {
    setDraggedWidget(id);
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
      if (draggedWidget && draggedWidget !== id) setDragOverWidget(id);
    },
    [draggedWidget],
  );

  const handleDragLeave = useCallback(() => {
    dragCounter.current--;
    if (dragCounter.current === 0) setDragOverWidget(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      dragCounter.current = 0;
      if (draggedWidget && draggedWidget !== targetId) {
        reorderWidgets(draggedWidget, targetId);
      }
      setDraggedWidget(null);
      setDragOverWidget(null);
    },
    [draggedWidget, reorderWidgets],
  );

  const handleDragEnd = useCallback(() => {
    dragCounter.current = 0;
    setDraggedWidget(null);
    setDragOverWidget(null);
  }, []);

  const handleMoveUp = useCallback(
    (widgetId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      moveWidgetUp(widgetId);
    },
    [moveWidgetUp],
  );

  const handleMoveDown = useCallback(
    (widgetId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      moveWidgetDown(widgetId);
    },
    [moveWidgetDown],
  );

  // Advanced-only: no mode toggle

  const renderWidget = (widget: (typeof widgets)[0], index: number) => {
    let content = null;
    switch (widget.type) {
      case 'price-info':
        content = <PriceInfoWidget isMobile={isMobile} />;
        break;
      case 'price-chart':
        content = <PriceChartWidget isMobile={isMobile} />;
        break;
      case 'volume-info':
        content = <VolumeInfoWidget isMobile={isMobile} />;
        break;
      case 'volume-chart':
        content = <VolumeChartWidget isMobile={isMobile} />;
        break;
      case 'sentiment':
        content = <SentimentWidget isMobile={isMobile} />;
        break;
      case 'forecast':
        if (!forecastEnabled) return null;
        content = <ForecastWidget isMobile={isMobile} />;
        break;
      case 'holders-info':
        content = <HoldersInfoWidget isMobile={isMobile} />;
        break;
      case 'holders-chart':
        content = <HoldersChartWidget isMobile={isMobile} />;
        break;
      case 'distribution-info':
        content = <DistributionWidget isMobile={isMobile} />;
        break;
      case 'raydium-info':
        content = <RaydiumWidget isMobile={isMobile} />;
        break;
      case 'stakers-unstakers-info':
        content = <StakersUnstakersWidget isMobile={isMobile} />;
        break;
      case 'staking-details':
        content = <StakingDetailsWidget isMobile={isMobile} />;
        break;
      case 'staking-info':
        content = <StakingWidget isMobile={isMobile} />;
        break;
      case 'blog-latest':
        content = (
          <BlogWidget isMobile={isMobile} mode={widget.size === 'full' ? 'multi' : 'single'} />
        );
        break;
      default:
        return null;
    }

    const isChart = widget.type.endsWith('chart');
    const isBlogWidget = widget.type === 'blog-latest';
    const isResizableWidget = isChart || isBlogWidget;
    const isHalfSize = widget.size === 'half';
    const spansTwoColumns = isResizableWidget && !isHalfSize;
    const beingDragged = draggedWidget === widget.id;
    const draggedOver = dragOverWidget === widget.id;
    const isFirstVisible = index === 0;
    const isLastVisible = index === visibleWidgets.length - 1;

    if (editMode) {
      return (
        <motion.div
          key={widget.id}
          layout
          layoutId={widget.id}
          data-widget-id={widget.id}
          className={cn(
            'relative group',
            isMobile ? 'col-span-1' : spansTwoColumns ? 'col-span-2' : 'col-span-1',
            beingDragged && 'opacity-50',
            draggedOver && 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg',
            isChart && isMobile ? 'min-h-[200px]' : undefined,
          )}
          draggable={!isMobile && editMode}
          onDragStart={(e) => handleDragStart(e, widget.id)}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, widget.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, widget.id)}
          onDragEnd={handleDragEnd}
          style={{
            cursor: editMode && !isMobile ? 'grab' : undefined,
          }}
          transition={{ layout: { type: 'spring', stiffness: 350, damping: 30 } }}
        >
          {/* Desktop drag handle or mobile move indicator */}
          <motion.div
            className="absolute -top-2 -right-2 z-10 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={!isMobile ? { scale: 1.1 } : {}}
          >
            {isMobile ? <Move className="w-3 h-3" /> : <GripVertical className="w-3 h-3" />}
          </motion.div>

          {/* Mobile arrow buttons */}
          {isMobile && (
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10 flex gap-1">
              <motion.button
                onClick={(e) => handleMoveUp(widget.id, e)}
                disabled={isFirstVisible}
                className={cn(
                  'bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg transition-all',
                  isFirstVisible && 'opacity-50 cursor-not-allowed',
                )}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                whileTap={!isFirstVisible ? { scale: 0.9 } : {}}
                title={t('moveWidgetUp')}
              >
                <ChevronUp className="w-3 h-3" />
              </motion.button>
              <motion.button
                onClick={(e) => handleMoveDown(widget.id, e)}
                disabled={isLastVisible}
                className={cn(
                  'bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg transition-all',
                  isLastVisible && 'opacity-50 cursor-not-allowed',
                )}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                whileTap={!isLastVisible ? { scale: 0.9 } : {}}
                title={t('moveWidgetDown')}
              >
                <ChevronDown className="w-3 h-3" />
              </motion.button>
            </div>
          )}

          {/* Mobile reorder button */}
          {isMobile && (
            <motion.button
              onClick={() => setReorderModalOpen(true)}
              className="absolute -top-2 left-2 z-10 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileTap={{ scale: 0.9 }}
              title={t('reorderWidgets')}
            >
              <Layers className="w-3 h-3" />
            </motion.button>
          )}

          {/* Desktop size toggle button for charts */}
          {isResizableWidget && !isMobile && (
            <motion.button
              onClick={() => toggleWidgetSize(widget.id)}
              className="absolute -top-2 -left-2 z-10 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              title={isHalfSize ? t('expandWidget') : t('shrinkWidget')}
            >
              {isHalfSize ? <Maximize className="w-3 h-3" /> : <Minimize className="w-3 h-3" />}
            </motion.button>
          )}

          <div
            className={cn(
              'ring-2 ring-primary/20 ring-offset-2 ring-offset-background rounded-lg h-full',
              editMode && 'pointer-events-none',
            )}
          >
            {content}
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={widget.id}
        layout
        layoutId={widget.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{
          layout: { type: 'spring', stiffness: 350, damping: 30 },
          opacity: { duration: 0.2 },
          scale: { duration: 0.2 },
        }}
        className={cn(
          isMobile ? 'col-span-1' : spansTwoColumns ? 'col-span-2' : 'col-span-1',
          'h-full',
          isChart && isMobile ? 'min-h-[200px]' : undefined,
        )}
      >
        {content}
      </motion.div>
    );
  };

  return (
    <>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="mb-6 flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Advanced-only: removed simple/advanced toggle */}

          <motion.button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              'p-2 rounded-lg transition-all duration-200',
              isRefreshing ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary',
            )}
            title={t('refreshButtonTitle')}
            whileHover={!isRefreshing ? { scale: 1.05 } : {}}
            whileTap={!isRefreshing ? { scale: 0.95 } : {}}
          >
            <motion.div
              animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={
                isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }
              }
            >
              <RefreshCw className="w-4 h-4" />
            </motion.div>
          </motion.button>

          <motion.button
            onClick={toggleEditMode}
            className={cn(
              'p-2 rounded-lg transition-all duration-200',
              editMode ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary',
            )}
            title={editMode ? t('saveLayout') : t('editLayout')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {editMode ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          </motion.button>

          <motion.button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg hover:bg-secondary transition-all duration-200"
            title={t('openSettings')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>

      {/* Edit Mode Banner */}
      <AnimatePresence>
        {editMode && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-4 overflow-hidden"
          >
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2">
              <Info className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-sm">
                <span className="font-medium">{t('editModeTitle')}:</span>{' '}
                {isMobile ? t('editModeDescMobile') : t('editModeDesc')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Mode Widget Grid (advanced-only) */}
      <div
        className={cn(
          'grid',
          isMobile
            ? 'grid-cols-1 gap-3 auto-rows-auto'
            : 'grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[minmax(200px,_auto)]',
        )}
      >
        <AnimatePresence mode="popLayout">
          {visibleWidgets.length > 0 ? (
            visibleWidgets.map((widget, index) => renderWidget(widget, index))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                'flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed text-center',
                isMobile ? 'col-span-1' : 'col-span-full',
              )}
            >
              <Info className="w-12 h-12 text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">{t('noWidgetsTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('noWidgetsDesc')}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Mobile Reorder Modal */}
      <MobileReorderModal open={reorderModalOpen} onOpenChange={setReorderModalOpen} />
    </>
  );
}
