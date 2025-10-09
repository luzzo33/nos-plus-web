'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { X, GripVertical, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useWidgetStore } from '@/lib/stores/widgetStore';
import {
  DollarSign,
  BarChart3,
  Gauge,
  Target,
  PieChart,
  Waves,
  Layers,
  ClipboardList,
  Users,
  Newspaper,
} from 'lucide-react';

interface MobileReorderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileReorderModal({ open, onOpenChange }: MobileReorderModalProps) {
  const { addToast } = useToast();
  const t = useTranslations('dashboard');
  const tw = useTranslations('widgets');
  const { widgets, setWidgets, toggleWidget } = useWidgetStore();
  const [localWidgets, setLocalWidgets] = useState(widgets);

  useEffect(() => {
    if (open) {
      setLocalWidgets(widgets);
    }
  }, [open, widgets]);

  const handleSave = () => {
    const updatedWidgets = localWidgets.map((widget, index) => ({
      ...widget,
      order: index,
    }));

    setWidgets(updatedWidgets);
    addToast({
      type: 'success',
      title: t('layoutSavedTitle'),
      description: t('layoutSavedDesc'),
    });
    onOpenChange(false);
  };

  const handleCancel = () => {
    setLocalWidgets(widgets);
    onOpenChange(false);
  };

  const getWidgetLabel = (type: string) => {
    switch (type) {
      case 'price-info':
        return tw('price');
      case 'price-chart':
        return tw('priceChart');
      case 'volume-info':
        return tw('volume');
      case 'volume-chart':
        return tw('volumeChart');
      case 'sentiment':
        return tw('fearAndGreed');
      case 'forecast':
        return tw('priceForecast');
      case 'distribution-info':
        return tw('distribution');
      case 'raydium-info':
        return tw('raydium');
      case 'stakers-unstakers-info':
        return tw('stakersUnstakers');
      case 'staking-details':
        return tw('stakingDetails');
      case 'staking-info':
        return tw('staking');
      case 'blog-latest':
        return tw('blog');
      default:
        return type.replace('-', ' ');
    }
  };

  const getWidgetIcon = (type: string) => {
    switch (type) {
      case 'price-info':
      case 'price-chart':
        return <DollarSign className="w-4 h-4" />;
      case 'volume-info':
      case 'volume-chart':
        return <BarChart3 className="w-4 h-4" />;
      case 'sentiment':
        return <Gauge className="w-4 h-4" />;
      case 'forecast':
        return <Target className="w-4 h-4" />;
      case 'distribution-info':
        return <PieChart className="w-4 h-4" />;
      case 'raydium-info':
        return <Waves className="w-4 h-4" />;
      case 'stakers-unstakers-info':
        return <Users className="w-4 h-4" />;
      case 'staking-details':
        return <ClipboardList className="w-4 h-4" />;
      case 'staking-info':
        return <Layers className="w-4 h-4" />;
      case 'blog-latest':
        return <Newspaper className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={handleCancel}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[500px] overflow-hidden z-50"
          >
            <div className="bg-card border border-border rounded-lg shadow-xl h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">{t('reorderWidgets')}</h2>
                <button
                  onClick={handleCancel}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Instructions */}
              <div className="p-4 bg-muted/50 border-b border-border">
                <p className="text-sm text-muted-foreground">{t('reorderInstructions')}</p>
              </div>

              {/* Widget List */}
              <div className="flex-1 overflow-y-auto p-4">
                <Reorder.Group
                  axis="y"
                  values={localWidgets}
                  onReorder={setLocalWidgets}
                  className="space-y-2"
                >
                  {localWidgets.map((widget) => (
                    <Reorder.Item
                      key={widget.id}
                      value={widget}
                      className={cn('relative', !widget.visible && 'opacity-60')}
                    >
                      <motion.div
                        layout
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border bg-background',
                          'cursor-grab active:cursor-grabbing',
                          'hover:border-primary/50 transition-colors',
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {/* Drag Handle */}
                        <div className="text-muted-foreground">
                          <GripVertical className="w-5 h-5" />
                        </div>

                        {/* Widget Icon */}
                        <div className="text-2xl">{getWidgetIcon(widget.type)}</div>

                        {/* Widget Info */}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{getWidgetLabel(widget.type)}</p>
                          <p className="text-xs text-muted-foreground">
                            {widget.visible ? t('widgetVisible') : t('widgetHidden')}
                          </p>
                        </div>

                        {/* Visibility Toggle */}
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            const updatedWidgets = localWidgets.map((w) =>
                              w.id === widget.id ? { ...w, visible: !w.visible } : w,
                            );
                            setLocalWidgets(updatedWidgets);
                          }}
                          className={cn(
                            'p-2 rounded-lg transition-colors',
                            widget.visible
                              ? 'bg-primary/10 text-primary hover:bg-primary/20'
                              : 'bg-secondary hover:bg-secondary/80',
                          )}
                          whileTap={{ scale: 0.9 }}
                        >
                          {widget.visible ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </motion.button>
                      </motion.div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
                <motion.button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm rounded-lg hover:bg-secondary transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('cancel')}
                </motion.button>
                <motion.button
                  onClick={handleSave}
                  className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('saveOrder')}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
