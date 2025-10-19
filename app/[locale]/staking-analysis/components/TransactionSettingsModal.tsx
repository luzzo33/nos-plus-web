'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type TimeDisplayMode = 'relative' | 'absolute';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250];

type TransactionSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  timeDisplayMode: TimeDisplayMode;
  onTimeDisplayChange: (mode: TimeDisplayMode) => void;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
};

export function TransactionSettingsModal({
  open,
  onClose,
  timeDisplayMode,
  onTimeDisplayChange,
  pageSize,
  onPageSizeChange,
}: TransactionSettingsModalProps) {
  const handleBackgroundClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="settings-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={handleBackgroundClick}
        >
          <motion.div
            className="card-base relative w-full max-w-md border border-border/70 bg-background/95 p-6 shadow-2xl"
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 rounded-md p-2 text-muted-foreground transition hover:bg-secondary/80"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Transaction stream settings</h2>
                <p className="text-sm text-muted-foreground">
                  Customize how timestamps and pagination behave inside the transaction table.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Timestamp display</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: 'relative' as TimeDisplayMode, label: 'Relative (e.g. 5m ago)' },
                      { value: 'absolute' as TimeDisplayMode, label: 'Absolute (e.g. 12:45 PM)' },
                    ]
                  ).map((option) => (
                    <button
                      key={option.value}
                      onClick={() => onTimeDisplayChange(option.value)}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-sm font-medium transition',
                        timeDisplayMode === option.value
                          ? 'border-primary/60 bg-primary/10 text-primary'
                          : 'border-border/70 bg-secondary/50 text-foreground hover:border-border',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Rows per page</h3>
                <div className="flex flex-wrap gap-2">
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <button
                      key={size}
                      onClick={() => onPageSizeChange(size)}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-sm font-semibold transition',
                        pageSize === size
                          ? 'border-primary/60 bg-primary/10 text-primary'
                          : 'border-border/60 bg-secondary/40 text-foreground hover:border-border',
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-border/70 px-4 py-2 text-sm font-semibold hover:bg-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
