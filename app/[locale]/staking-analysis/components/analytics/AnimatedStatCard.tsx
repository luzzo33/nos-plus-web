'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useSpring, useTransform } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';

interface AnimatedStatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  delay?: number;
  className?: string;
}

export function AnimatedStatCard({
  title,
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-primary',
  trend,
  delay = 0,
  className = '',
}: AnimatedStatCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [hasAnimated, setHasAnimated] = useState(false);

  const spring = useSpring(0, { stiffness: 75, damping: 30, mass: 0.8 });
  const display = useTransform(spring, (latest) => {
    const formatted = latest.toFixed(decimals);
    return `${prefix}${Number(formatted).toLocaleString(undefined, {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals > 0 ? 0 : undefined,
    })}${suffix}`;
  });

  useEffect(() => {
    if (isInView && !hasAnimated) {
      const timer = setTimeout(() => {
        spring.set(value);
        setHasAnimated(true);
      }, delay);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isInView, value, spring, delay, hasAnimated]);

  const determinedTrend =
    trend || (change && change > 0 ? 'up' : change && change < 0 ? 'down' : 'neutral');
  const TrendIcon =
    determinedTrend === 'up' ? TrendingUp : determinedTrend === 'down' ? TrendingDown : Minus;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: delay / 1000 }}
      className={`card-base card-hover p-3 sm:p-4 md:p-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">{title}</p>
          <motion.p
            className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl"
            initial={{ scale: 0.95 }}
            animate={hasAnimated ? { scale: 1 } : {}}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: (delay + 200) / 1000 }}
          >
            <motion.span>{display}</motion.span>
          </motion.p>
          {change !== undefined && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: (delay + 400) / 1000 }}
              className={`badge-delta ${
                determinedTrend === 'up'
                  ? 'data-[trend=up]:badge-delta'
                  : determinedTrend === 'down'
                  ? 'data-[trend=down]:badge-delta'
                  : ''
              }`}
              data-trend={determinedTrend}
            >
              <TrendIcon className="h-3.5 w-3.5" />
              <span>
                {change > 0 ? '+' : ''}
                {change.toFixed(2)}%
              </span>
              {changeLabel && <span className="text-[0.65rem] opacity-70">• {changeLabel}</span>}
            </motion.div>
          )}
        </div>
        {Icon && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={isInView ? { scale: 1, rotate: 0 } : {}}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: (delay + 100) / 1000 }}
            className={`flex-shrink-0 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-2 sm:p-2.5 ${iconColor}`}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
