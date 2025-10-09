'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, RefreshCw, Layout, Palette, Eye, EyeOff, Edit2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useWidgetStore } from '@/lib/stores/widgetStore';
import { useDashboardSettingsStore } from '@/lib/stores/dashboardSettingsStore';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('widgets');
  const t = useTranslations('settings');
  const tw = useTranslations('widgets');
  const { widgets, toggleWidget } = useWidgetStore();
  const { timeDisplayMode, setTimeDisplayMode, dashboardMode } = useDashboardSettingsStore();

  const [settings, setSettings] = useState({
    autoRefresh: true,
    refreshInterval: 60,
    notifications: true,
    priceAlerts: false,
    alertThreshold: 5,
    animationsEnabled: true,
  });

  const handleSave = () => {
    localStorage.setItem('dashboard-settings', JSON.stringify(settings));
    addToast({
      type: 'success',
      title: t('settingsSaved'),
      description: t('preferencesUpdated'),
    });
    onOpenChange(false);
  };

  const handleEditWidgets = () => {
    onOpenChange(false);
    addToast({
      type: 'info',
      title: t('editWidgetLayout'),
      description: t('useEditButton'),
    });
  };

  const tabs = [
    { id: 'widgets', label: t('widgets'), icon: Layout, disabled: false },
    { id: 'display', label: t('display'), icon: Palette, disabled: false },
    { id: 'notifications', label: t('alerts'), icon: Bell, disabled: false },
    { id: 'data', label: t('data'), icon: RefreshCw, disabled: false },
  ];

  useEffect(() => {
    if (open && !tabs.find((t) => t.id === activeTab)) {
      setActiveTab('widgets');
    }
  }, [open, activeTab]);

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
      case 'holders-info':
        return tw('holders');
      case 'holders-chart':
        return tw('holdersChart');
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

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-4 md:inset-x-auto md:inset-y-[10%] md:left-1/2 md:-translate-x-1/2 md:w-[600px] md:max-h-[80vh] overflow-hidden z-50"
          >
            <div className="bg-card border border-border rounded-lg shadow-xl h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
                <h2 className="text-lg md:text-xl font-semibold">{t('title')}</h2>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-2 bg-secondary/50 border-b border-border overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => !tab.disabled && setActiveTab(tab.id)}
                    disabled={tab.disabled}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap text-sm',
                      tab.disabled && 'opacity-50 cursor-not-allowed',
                      activeTab === tab.id
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <AnimatePresence mode="wait">
                  {activeTab === 'widgets' && (
                    <motion.div
                      key="widgets"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium">{t('manageWidgets')}</h3>
                        <motion.button
                          onClick={handleEditWidgets}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs md:text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{t('editLayout')}</span>
                        </motion.button>
                      </div>

                      {widgets &&
                        widgets.map((widget, index) => (
                          <motion.div
                            key={widget.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                          >
                            <div>
                              <p className="font-medium capitalize text-sm">
                                {getWidgetLabel(widget.type)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Widget ID: {widget.id}
                              </p>
                            </div>
                            <motion.button
                              onClick={() => toggleWidget(widget.id)}
                              className={cn(
                                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors',
                                widget.visible
                                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                  : 'bg-secondary hover:bg-secondary/80',
                              )}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              {widget.visible ? (
                                <>
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{t('visible')}</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" />
                                  <span>{t('hidden')}</span>
                                </>
                              )}
                            </motion.button>
                          </motion.div>
                        ))}
                    </motion.div>
                  )}

                  {activeTab === 'display' && (
                    <motion.div
                      key="display"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="p-3 rounded-lg bg-secondary/50 space-y-3">
                        <div>
                          <p className="font-medium text-sm">{t('timeDisplay')}</p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {t('timeDisplayDescription')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <motion.button
                            onClick={() => setTimeDisplayMode('absolute')}
                            className={cn(
                              'flex-1 px-3 py-2 text-xs md:text-sm rounded-lg border transition-colors',
                              timeDisplayMode === 'absolute'
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-border text-muted-foreground hover:text-foreground',
                            )}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {t('timeAbsolute')}
                          </motion.button>
                          <motion.button
                            onClick={() => setTimeDisplayMode('relative')}
                            className={cn(
                              'flex-1 px-3 py-2 text-xs md:text-sm rounded-lg border transition-colors',
                              timeDisplayMode === 'relative'
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-border text-muted-foreground hover:text-foreground',
                            )}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {t('timeRelative')}
                          </motion.button>
                        </div>
                        <p className="text-[11px] md:text-xs text-muted-foreground">
                          {timeDisplayMode === 'relative'
                            ? t('timeRelativeHint')
                            : t('timeAbsoluteHint')}
                        </p>
                      </div>

                      <label className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 cursor-pointer">
                        <div>
                          <p className="font-medium text-sm">{t('animations')}</p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {t('enableSmoothAnimations')}
                          </p>
                        </div>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={settings.animationsEnabled}
                            onChange={(e) =>
                              setSettings({ ...settings, animationsEnabled: e.target.checked })
                            }
                            className="sr-only"
                          />
                          <motion.div
                            className={cn(
                              'w-10 h-6 rounded-full transition-colors',
                              settings.animationsEnabled ? 'bg-primary' : 'bg-input',
                            )}
                            whileTap={{ scale: 0.95 }}
                          >
                            <motion.div
                              className="absolute top-1 left-1 w-4 h-4 rounded-full bg-background"
                              animate={{ x: settings.animationsEnabled ? 16 : 0 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            />
                          </motion.div>
                        </div>
                      </label>
                    </motion.div>
                  )}

                  {activeTab === 'notifications' && (
                    <motion.div
                      key="notifications"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <label className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 cursor-pointer">
                        <div>
                          <p className="font-medium text-sm">{t('notifications')}</p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {t('enableNotifications')}
                          </p>
                        </div>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={settings.notifications}
                            onChange={(e) =>
                              setSettings({ ...settings, notifications: e.target.checked })
                            }
                            className="sr-only"
                          />
                          <motion.div
                            className={cn(
                              'w-10 h-6 rounded-full transition-colors',
                              settings.notifications ? 'bg-primary' : 'bg-input',
                            )}
                            whileTap={{ scale: 0.95 }}
                          >
                            <motion.div
                              className="absolute top-1 left-1 w-4 h-4 rounded-full bg-background"
                              animate={{ x: settings.notifications ? 16 : 0 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            />
                          </motion.div>
                        </div>
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 cursor-pointer">
                        <div>
                          <p className="font-medium text-sm">{t('priceAlerts')}</p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {t('notifyPriceChanges')}
                          </p>
                        </div>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={settings.priceAlerts}
                            onChange={(e) =>
                              setSettings({ ...settings, priceAlerts: e.target.checked })
                            }
                            className="sr-only"
                          />
                          <motion.div
                            className={cn(
                              'w-10 h-6 rounded-full transition-colors',
                              settings.priceAlerts ? 'bg-primary' : 'bg-input',
                            )}
                            whileTap={{ scale: 0.95 }}
                          >
                            <motion.div
                              className="absolute top-1 left-1 w-4 h-4 rounded-full bg-background"
                              animate={{ x: settings.priceAlerts ? 16 : 0 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            />
                          </motion.div>
                        </div>
                      </label>

                      {settings.priceAlerts && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-3 rounded-lg bg-secondary/50"
                        >
                          <label>
                            <p className="font-medium text-sm mb-2">{t('alertThreshold')}</p>
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min="1"
                                max="20"
                                value={settings.alertThreshold}
                                onChange={(e) =>
                                  setSettings({
                                    ...settings,
                                    alertThreshold: parseInt(e.target.value),
                                  })
                                }
                                className="flex-1"
                              />
                              <span className="text-sm font-medium min-w-[3ch]">
                                {settings.alertThreshold}%
                              </span>
                            </div>
                          </label>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'data' && (
                    <motion.div
                      key="data"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <label className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 cursor-pointer">
                        <div>
                          <p className="font-medium text-sm">{t('autoRefresh')}</p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {t('automaticallyRefreshData')}
                          </p>
                        </div>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={settings.autoRefresh}
                            onChange={(e) =>
                              setSettings({ ...settings, autoRefresh: e.target.checked })
                            }
                            className="sr-only"
                          />
                          <motion.div
                            className={cn(
                              'w-10 h-6 rounded-full transition-colors',
                              settings.autoRefresh ? 'bg-primary' : 'bg-input',
                            )}
                            whileTap={{ scale: 0.95 }}
                          >
                            <motion.div
                              className="absolute top-1 left-1 w-4 h-4 rounded-full bg-background"
                              animate={{ x: settings.autoRefresh ? 16 : 0 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            />
                          </motion.div>
                        </div>
                      </label>

                      {settings.autoRefresh && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-3 rounded-lg bg-secondary/50"
                        >
                          <label>
                            <p className="font-medium text-sm mb-2">{t('refreshInterval')}</p>
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min="30"
                                max="300"
                                step="30"
                                value={settings.refreshInterval}
                                onChange={(e) =>
                                  setSettings({
                                    ...settings,
                                    refreshInterval: parseInt(e.target.value),
                                  })
                                }
                                className="flex-1"
                              />
                              <span className="text-sm font-medium min-w-[4ch]">
                                {settings.refreshInterval < 60
                                  ? `${settings.refreshInterval} ${t('seconds')}`
                                  : settings.refreshInterval === 60
                                    ? `1 ${t('minute')}`
                                    : `${Math.floor(settings.refreshInterval / 60)} ${t('minutes')}`}
                              </span>
                            </div>
                          </label>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-4 md:p-6 border-t border-border">
                <motion.button
                  onClick={() => onOpenChange(false)}
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
                  {t('saveSettings')}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
