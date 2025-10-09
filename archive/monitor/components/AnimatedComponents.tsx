'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, TrendingUp, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketPulseProps {
  isActive?: boolean;
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export function MarketPulse({
  isActive = true,
  intensity = 'medium',
  className,
}: MarketPulseProps) {
  const intensityConfig = {
    low: { bars: 3, maxHeight: 'h-4', speed: 2 },
    medium: { bars: 5, maxHeight: 'h-6', speed: 1.5 },
    high: { bars: 7, maxHeight: 'h-8', speed: 1 },
  };

  const config = intensityConfig[intensity];

  return (
    <div className={cn('flex items-end gap-1', className)}>
      {Array.from({ length: config.bars }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            'w-1 bg-gradient-to-t rounded-full',
            isActive ? 'from-emerald-500 to-emerald-600' : 'from-muted to-muted-foreground/50',
            config.maxHeight,
          )}
          animate={
            isActive
              ? {
                  scaleY: [0.3, 1, 0.3],
                  opacity: [0.5, 1, 0.5],
                }
              : {
                  scaleY: 0.3,
                  opacity: 0.3,
                }
          }
          transition={{
            duration: config.speed,
            repeat: isActive ? Infinity : 0,
            delay: i * 0.1,
            ease: 'easeInOut',
          }}
          style={{ transformOrigin: 'bottom' }}
        />
      ))}
    </div>
  );
}

interface ActivityIndicatorProps {
  level: number;
  label?: string;
  className?: string;
}

export function ActivityIndicator({ level, label, className }: ActivityIndicatorProps) {
  const getColor = (level: number) => {
    if (level >= 80) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (level >= 60) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    if (level >= 40) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
  };

  const getIntensity = (level: number): 'low' | 'medium' | 'high' => {
    if (level >= 70) return 'high';
    if (level >= 40) return 'medium';
    return 'low';
  };

  return (
    <div
      className={cn('flex items-center gap-3 p-3 rounded-xl border', getColor(level), className)}
    >
      <MarketPulse intensity={getIntensity(level)} isActive={level > 20} />
      <div className="flex-1">
        {label && <div className="text-xs opacity-80 mb-1">{label}</div>}
        <div className="flex items-center gap-2">
          <div className="text-lg font-bold">{level}%</div>
          <div className="flex-1 h-2 bg-background/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${level}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-current rounded-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface TransactionFlowProps {
  transactions: Array<{
    side: 'buy' | 'sell';
    value: number;
    timestamp: number;
  }>;
  className?: string;
}

export function TransactionFlow({ transactions, className }: TransactionFlowProps) {
  const recentTransactions = transactions
    .filter((tx) => Date.now() - tx.timestamp < 30000)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  return (
    <div
      className={cn(
        'relative h-16 overflow-hidden rounded-lg border border-border/30 bg-gradient-to-r from-background to-muted/20',
        className,
      )}
    >
      <div className="absolute inset-0 flex items-center">
        {recentTransactions.map((tx, i) => (
          <motion.div
            key={`${tx.timestamp}-${i}`}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: `-${(i + 1) * 15}%`, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ duration: 2, ease: 'linear' }}
            className={cn(
              'absolute w-2 h-8 rounded-full',
              tx.side === 'buy' ? 'bg-emerald-500' : 'bg-red-500',
            )}
            style={{
              height: `${Math.min(80, (tx.value / 10000) * 60 + 20)}%`,
              filter: `blur(${i * 0.5}px)`,
            }}
          />
        ))}
      </div>

      {/* Flow Lines */}
      <div className="absolute inset-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            style={{ width: '200%', transform: 'translateY(-50%)' }}
            animate={{ x: ['-100%', '0%'] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface PulsingDotProps {
  color?: 'green' | 'red' | 'blue' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PulsingDot({ color = 'green', size = 'md', className }: PulsingDotProps) {
  const colorConfig = {
    green: 'bg-emerald-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
  };

  const sizeConfig = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div className={cn('relative', className)}>
      <div className={cn('rounded-full animate-pulse', colorConfig[color], sizeConfig[size])} />
      <div
        className={cn(
          'absolute inset-0 rounded-full animate-ping',
          colorConfig[color],
          sizeConfig[size],
        )}
        style={{ animationDuration: '2s' }}
      />
    </div>
  );
}
