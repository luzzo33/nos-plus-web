'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, ChevronDown } from 'lucide-react';

interface BlogSummaryToggleProps {
  summary?: string | null;
  title: string;
  showLabel: string;
  hideLabel: string;
  unavailableLabel: string;
}

export function BlogSummaryToggle({
  summary,
  title,
  showLabel,
  hideLabel,
  unavailableLabel,
}: BlogSummaryToggleProps) {
  const [open, setOpen] = useState(false);
  const hasSummary = Boolean(summary && summary.trim().length);

  const handleToggle = () => {
    if (!hasSummary) return;
    setOpen((prev) => !prev);
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-soft">
      <button
        type="button"
        onClick={handleToggle}
        disabled={!hasSummary}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-primary/15 p-2 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold text-foreground">{title}</div>
            <div className="text-xs text-muted-foreground">
              {hasSummary ? (open ? hideLabel : showLabel) : unavailableLabel}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''} ${hasSummary ? 'text-primary' : 'text-muted-foreground'}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && hasSummary && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mt-4 rounded-xl border border-border/50 bg-background/80 p-4 text-sm leading-relaxed text-muted-foreground"
          >
            {summary}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
