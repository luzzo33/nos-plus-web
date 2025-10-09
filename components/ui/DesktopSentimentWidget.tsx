'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Users, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';

interface SentimentStats {
  total: number;
  bullish: {
    count: number;
    percentage: number;
  };
  bearish: {
    count: number;
    percentage: number;
  };
  period: string;
  lastUpdate: string | null;
}

interface DesktopSentimentWidgetProps {
  onVote?: (sentiment: 'bullish' | 'bearish') => Promise<void>;
  onStatsUpdate?: (stats: SentimentStats) => void;
  className?: string;
  showVoting?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface VoteResponse {
  success: boolean;
  message: string;
  alreadyVoted?: boolean;
  updated?: boolean;
}

export function DesktopSentimentWidget({
  onVote,
  onStatsUpdate,
  className,
  showVoting = true,
  autoRefresh = true,
  refreshInterval = 30000,
}: DesktopSentimentWidgetProps) {
  const [stats, setStats] = useState<SentimentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voteStatus, setVoteStatus] = useState<{
    voted: boolean;
    sentiment?: 'bullish' | 'bearish';
    message?: string;
  }>({ voted: false });
  const ts = useTranslations('sentiment');
  const tc = useTranslations('common');
  const locale = useLocale();

  const getSentimentLabel = (value: 'bullish' | 'bearish') =>
    value === 'bullish' ? ts('labels.bullish') : ts('labels.bearish');

  useEffect(() => {
    const checkVoteStatus = () => {
      const today = new Date().toDateString();
      const lastVote = localStorage.getItem('nos-sentiment-vote');

      if (lastVote) {
        try {
          const voteData = JSON.parse(lastVote);
          if (voteData.date === today) {
            setVoteStatus({
              voted: true,
              sentiment: voteData.sentiment,
              message: ts('messages.alreadyVoted', {
                sentiment: getSentimentLabel(voteData.sentiment),
              }),
            });
          }
        } catch {}
      }
    };

    checkVoteStatus();
  }, []);

  const fetchStats = async () => {
    try {
      setError(null);
      const response = await fetch('/api/v3/sentiment-feedback/stats?period=24h');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch stats');
      }

      setStats(data.stats);
      if (onStatsUpdate) {
        onStatsUpdate(data.stats);
      }
    } catch (error) {
      const fallback = ts('errors.loadFailed');
      setError(error instanceof Error ? error.message || fallback : fallback);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    if (autoRefresh) {
      const interval = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const handleVote = async (sentiment: 'bullish' | 'bearish') => {
    if (isVoting) return;

    setIsVoting(true);
    setError(null);

    try {
      if (onVote) {
        await onVote(sentiment);
      } else {
        const response = await fetch('/api/v3/sentiment-feedback/vote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sentiment }),
        });

        const result: VoteResponse = await response.json();

        if (!result.success) {
          throw new Error(result.message || ts('errors.submitFailed'));
        }
      }

      const today = new Date().toDateString();
      localStorage.setItem(
        'nos-sentiment-vote',
        JSON.stringify({
          sentiment,
          date: today,
          timestamp: new Date().toISOString(),
        }),
      );

      setVoteStatus({
        voted: true,
        sentiment,
        message: ts('messages.thanks', { sentiment: getSentimentLabel(sentiment) }),
      });

      setTimeout(() => {
        fetchStats();
      }, 1000);
    } catch (error) {
      const fallback = ts('errors.submitFailed');
      setError(error instanceof Error ? error.message || fallback : fallback);
    } finally {
      setIsVoting(false);
    }
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  const formatLastUpdate = (lastUpdate: string | null) => {
    if (!lastUpdate) return ts('time.noVotes');

    const date = new Date(lastUpdate);
    if (Number.isNaN(date.getTime())) return ts('time.noVotes');

    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return ts('time.justNow');
    if (diffInMinutes < 60) return ts('time.minutesAgo', { count: diffInMinutes });
    if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return ts('time.hoursAgo', { count: hours });
    }
    return new Intl.DateTimeFormat(locale).format(date);
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6',
          className,
        )}
      >
        <div className="flex items-center justify-center h-48">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
          />
          <span className="ml-3 text-gray-600 dark:text-gray-400">{ts('loading')}</span>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div
        className={cn(
          'bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 p-6',
          className,
        )}
      >
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
            {ts('errors.loadFailed')}
          </h3>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <motion.button
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className="w-4 h-4" />
            {tc('retry')}
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {ts('title')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{ts('subtitle')}</p>
          </div>
        </div>

        <motion.button
          onClick={fetchStats}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          whileTap={{ scale: 0.95 }}
          disabled={isLoading}
        >
          <RefreshCw className={cn('w-5 h-5 text-gray-400', isLoading && 'animate-spin')} />
        </motion.button>
      </div>

      {/* Stats Display */}
      {stats && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.total}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {ts('meta.totalVotes24h')}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {ts('meta.lastUpdate', { time: formatLastUpdate(stats.lastUpdate) })}
            </div>
          </div>

          {/* Sentiment Bars */}
          <div className="space-y-3">
            {/* Bullish */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 min-w-[80px]">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  {ts('labels.bullish')}
                </span>
              </div>
              <div className="flex-1">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.bullish.percentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-[60px] justify-end">
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {formatPercentage(stats.bullish.percentage)}
                </span>
                <span className="text-xs text-gray-400">({stats.bullish.count})</span>
              </div>
            </div>

            {/* Bearish */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 min-w-[80px]">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  {ts('labels.bearish')}
                </span>
              </div>
              <div className="flex-1">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.bearish.percentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-[60px] justify-end">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {formatPercentage(stats.bearish.percentage)}
                </span>
                <span className="text-xs text-gray-400">({stats.bearish.count})</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Vote Status Message */}
      {voteStatus.message && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <p className="text-sm text-blue-800 dark:text-blue-200">{voteStatus.message}</p>
          </div>
        </div>
      )}

      {/* Voting Buttons */}
      {showVoting && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {voteStatus.voted ? ts('cta.alreadyVoted') : ts('cta.castVote')}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              onClick={() => handleVote('bullish')}
              disabled={isVoting || voteStatus.voted}
              className={cn(
                'flex items-center justify-center gap-2 p-3 rounded-lg transition-all duration-200',
                voteStatus.sentiment === 'bullish'
                  ? 'bg-green-100 border-2 border-green-500 text-green-700 dark:bg-green-900/20 dark:border-green-400 dark:text-green-300'
                  : 'bg-green-50 hover:bg-green-100 border border-green-200 text-green-600 dark:bg-gray-700 dark:hover:bg-green-900/10 dark:border-gray-600 dark:text-green-400',
                (isVoting || voteStatus.voted) && 'opacity-60 cursor-not-allowed',
              )}
              whileTap={{ scale: voteStatus.voted ? 1 : 0.95 }}
              whileHover={{ scale: voteStatus.voted ? 1 : 1.02 }}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">{ts('labels.bullish')}</span>
            </motion.button>

            <motion.button
              onClick={() => handleVote('bearish')}
              disabled={isVoting || voteStatus.voted}
              className={cn(
                'flex items-center justify-center gap-2 p-3 rounded-lg transition-all duration-200',
                voteStatus.sentiment === 'bearish'
                  ? 'bg-red-100 border-2 border-red-500 text-red-700 dark:bg-red-900/20 dark:border-red-400 dark:text-red-300'
                  : 'bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 dark:bg-gray-700 dark:hover:bg-red-900/10 dark:border-gray-600 dark:text-red-400',
                (isVoting || voteStatus.voted) && 'opacity-60 cursor-not-allowed',
              )}
              whileTap={{ scale: voteStatus.voted ? 1 : 0.95 }}
              whileHover={{ scale: voteStatus.voted ? 1 : 1.02 }}
            >
              <TrendingDown className="w-5 h-5" />
              <span className="font-medium">{ts('labels.bearish')}</span>
            </motion.button>
          </div>

          {isVoting && (
            <div className="flex items-center justify-center mt-3 py-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
              />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {ts('cta.submitting')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
