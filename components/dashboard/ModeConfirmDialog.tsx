'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ModeConfirmDialogProps {
  open: boolean;
  onConfirm: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

export function ModeConfirmDialog({ open, onConfirm, onCancel }: ModeConfirmDialogProps) {
  const t = useTranslations('dashboard');
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[450px] z-50"
          >
            <div className="bg-card border border-border rounded-lg shadow-xl p-6">
              {/* Icon */}
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/10 mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold mb-2">{t('modeChangeWarningTitle')}</h3>
              <p className="text-sm text-muted-foreground mb-6">{t('modeChangeWarningDesc')}</p>

              {/* Checkbox */}
              <label className="flex items-center gap-2 mb-6 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  {t('dontShowAgain')}
                </span>
              </label>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <motion.button
                  onClick={onCancel}
                  className="px-4 py-2 text-sm rounded-lg hover:bg-secondary transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('cancel')}
                </motion.button>
                <motion.button
                  onClick={() => onConfirm(dontShowAgain)}
                  className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('confirm')}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
