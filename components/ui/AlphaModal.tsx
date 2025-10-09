'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Github, Twitter } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface AlphaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AlphaModal({ isOpen, onClose }: AlphaModalProps) {
  const t = useTranslations('alphaModal');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <div
              className="bg-background border border-border rounded-xl shadow-xl max-w-md w-full mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-orange-500/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{t('title')}</h2>
                    <p className="text-sm text-muted-foreground">{t('version')}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed">{t('welcome')}</p>

                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 space-y-2">
                    <h3 className="font-medium text-orange-700 dark:text-orange-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {t('expectationsTitle')}
                    </h3>
                    <ul className="text-sm text-orange-600 dark:text-orange-300 space-y-1">
                      <li>• {t('expectations.updates')}</li>
                      <li>• {t('expectations.changes')}</li>
                      <li>• {t('expectations.bugs')}</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-medium">{t('helpTitle')}</h3>
                    <p className="text-sm text-muted-foreground">{t('helpDescription')}</p>

                    <div className="flex gap-2">
                      <a
                        href="https://github.com/luzzo33/nos-plus-web"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm transition-colors flex-1"
                      >
                        <Github className="w-4 h-4" />
                        {t('github')}
                      </a>
                      <a
                        href="https://x.com/nos_plus"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm transition-colors flex-1"
                      >
                        <Twitter className="w-4 h-4" />
                        {t('twitter')}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border">
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  {t('gotIt')}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
