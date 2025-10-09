'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';
import { useTranslations } from 'next-intl';

interface SentimentIndicatorProps {
  className?: string;
  isMobile?: boolean;
}

interface UserVoteState {
  hasVoted: boolean;
  sentiment?: 'bullish' | 'bearish';
  lastVoteTime?: string;
  nextVoteTime?: string;
}

export function SentimentIndicator({ className, isMobile = false }: SentimentIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [userVoteState, setUserVoteState] = useState<UserVoteState>({ hasVoted: false });
  const [voteMessage, setVoteMessage] = useState<string>('');
  const queryClient = useQueryClient();
  const ts = useTranslations('sentiment');

  const getSentimentLabel = useCallback(
    (value: 'bullish' | 'bearish') =>
      value === 'bullish' ? ts('labels.bullish') : ts('labels.bearish'),
    [ts],
  );

  const {
    data: statsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['sentiment-feedback-stats', '24h'],
    queryFn: () => apiClient.getSentimentFeedbackStats({ period: '24h' }),
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const stats = statsData?.stats;
  const bullishPercentage = stats?.bullish.percentage || 0;
  const bearishPercentage = stats?.bearish.percentage || 0;
  const totalVotes = stats?.total || 0;

  const checkUserVoteStatus = useCallback(() => {
    const today = new Date().toDateString();
    const voteKey = `nos-sentiment-vote-${today}`;
    const storedVote = localStorage.getItem(voteKey);

    if (storedVote) {
      try {
        const voteData = JSON.parse(storedVote);
        const voteDate = new Date(voteData.timestamp);
        const nextVote = new Date(voteDate);
        nextVote.setHours(24, 0, 0, 0);

        setUserVoteState({
          hasVoted: true,
          sentiment: voteData.sentiment,
          lastVoteTime: voteData.timestamp,
          nextVoteTime: nextVote.toISOString(),
        });

        const hoursUntilNext = Math.ceil((nextVote.getTime() - Date.now()) / (1000 * 60 * 60));
        setVoteMessage(
          ts('messages.alreadyTodayCountdown', {
            sentiment: getSentimentLabel(voteData.sentiment),
            hours: hoursUntilNext,
          }),
        );
      } catch {
        localStorage.removeItem(voteKey);
        setUserVoteState({ hasVoted: false });
      }
    } else {
      setUserVoteState({ hasVoted: false });
      setVoteMessage('');
    }
  }, [getSentimentLabel, ts]);

  useEffect(() => {
    checkUserVoteStatus();
  }, [checkUserVoteStatus]);

  const handleVote = async (sentiment: 'bullish' | 'bearish') => {
    if (isVoting || userVoteState.hasVoted) return;

    setIsVoting(true);
    setVoteMessage(ts('cta.submitting'));

    try {
      const response = await apiClient.submitSentimentVote(sentiment);

      const today = new Date().toDateString();
      const voteKey = `nos-sentiment-vote-${today}`;
      const voteData = {
        sentiment,
        timestamp: new Date().toISOString(),
        date: today,
      };

      localStorage.setItem(voteKey, JSON.stringify(voteData));

      const nextVote = new Date();
      nextVote.setHours(24, 0, 0, 0);

      setUserVoteState({
        hasVoted: true,
        sentiment,
        lastVoteTime: voteData.timestamp,
        nextVoteTime: nextVote.toISOString(),
      });

      const hoursUntilNext = Math.ceil((nextVote.getTime() - Date.now()) / (1000 * 60 * 60));
      setVoteMessage(
        ts('messages.thanksCountdown', {
          sentiment: getSentimentLabel(sentiment),
          hours: hoursUntilNext,
        }),
      );

      queryClient.invalidateQueries({ queryKey: ['sentiment-feedback-stats'] });

      setTimeout(() => {
        if (!isMobile) setIsExpanded(false);
      }, 3000);
    } catch (error: any) {
      if (error.response?.status === 409) {
        checkUserVoteStatus();
        setVoteMessage(ts('messages.alreadyVotedToday'));
      } else {
        setVoteMessage(ts('errors.submitRetry'));
      }
    } finally {
      setIsVoting(false);
    }
  };

  const isDominantBullish = bullishPercentage > bearishPercentage;
  const dominantPercentage = Math.max(bullishPercentage, bearishPercentage);

  if (isLoading || error || !stats) {
    return null;
  }

  if (isMobile) {
    return (
      <div className={cn('relative', className)}>
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          whileTap={{ scale: 0.95 }}
          title={ts('title')}
        >
          <div className="flex items-center gap-1">
            <span className="text-sm">{isDominantBullish ? '📈' : '📉'}</span>
            <span className="text-xs font-medium">{dominantPercentage.toFixed(0)}%</span>
          </div>
        </motion.button>

        <AnimatePresence>
          {isExpanded && (
            <>
              {/* Full-screen backdrop with focus effect (no header blur) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed top-0 left-0 right-0 bottom-0 bg-black/40 z-[999999]"
                style={{
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  width: '100vw',
                  height: '100vh',
                  maskImage:
                    'linear-gradient(to bottom, transparent 0%, transparent 5rem, black 5rem, black 100%)',
                  WebkitMaskImage:
                    'linear-gradient(to bottom, transparent 0%, transparent 5rem, black 5rem, black 100%)',
                }}
                onClick={() => setIsExpanded(false)}
              />

              {/* Modal with click-anywhere-to-close wrapper */}
              <div
                className="fixed top-0 left-0 right-0 bottom-0 z-[999999] flex items-start justify-center pt-20 px-4"
                onClick={() => setIsExpanded(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="w-full max-w-sm bg-card border border-border rounded-lg p-4 shadow-2xl"
                  style={{
                    maxHeight: 'calc(100vh - 6rem)',
                    overflowY: 'auto',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Users className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold">{ts('title')}</h3>
                    </div>

                    <div className="text-sm text-muted-foreground mb-4">
                      {ts('meta.votesToday', { count: totalVotes })}
                    </div>

                    <div className="space-y-3 mb-4">
                      {/* Bullish */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-500" />
                            <span className="text-sm font-medium">
                              {getSentimentLabel('bullish')}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold text-green-600 dark:text-green-500">
                              {bullishPercentage.toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground ml-1">
                              ({stats.bullish.count})
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-green-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${bullishPercentage}%` }}
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                      </div>

                      {/* Bearish */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-500" />
                            <span className="text-sm font-medium">
                              {getSentimentLabel('bearish')}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold text-red-600 dark:text-red-500">
                              {bearishPercentage.toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground ml-1">
                              ({stats.bearish.count})
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-red-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${bearishPercentage}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Vote Status Message */}
                    {voteMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-lg mb-3 text-sm',
                          userVoteState.hasVoted
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
                        )}
                      >
                        {userVoteState.hasVoted ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : isVoting ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                          />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                        {voteMessage}
                      </motion.div>
                    )}

                    {/* Voting Buttons */}
                    {!userVoteState.hasVoted ? (
                      <div>
                        <p className="text-sm text-muted-foreground mb-3">{ts('cta.prompt')}</p>
                        <div className="flex gap-2">
                          <motion.button
                            onClick={() => handleVote('bullish')}
                            disabled={isVoting}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-lg transition-all',
                              'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200',
                              'dark:bg-green-900/30 dark:hover:bg-green-900/40 dark:text-green-400 dark:border-green-700',
                              isVoting && 'opacity-50 cursor-not-allowed',
                            )}
                            whileTap={{ scale: isVoting ? 1 : 0.95 }}
                          >
                            <TrendingUp className="w-4 h-4" />
                            {getSentimentLabel('bullish')}
                          </motion.button>
                          <motion.button
                            onClick={() => handleVote('bearish')}
                            disabled={isVoting}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-lg transition-all',
                              'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200',
                              'dark:bg-red-900/30 dark:hover:bg-red-900/40 dark:text-red-400 dark:border-red-700',
                              isVoting && 'opacity-50 cursor-not-allowed',
                            )}
                            whileTap={{ scale: isVoting ? 1 : 0.95 }}
                          >
                            <TrendingDown className="w-4 h-4" />
                            {getSentimentLabel('bearish')}
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn(
                          'flex items-center justify-center gap-2 py-2 px-3 rounded-lg',
                          userVoteState.sentiment === 'bullish'
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700',
                        )}
                      >
                        {userVoteState.sentiment === 'bullish' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {userVoteState.sentiment ? (
                          <span className="font-medium">
                            {ts('messages.alreadySimple', {
                              sentiment: getSentimentLabel(userVoteState.sentiment),
                            })}
                          </span>
                        ) : null}
                      </motion.div>
                    )}

                    <button
                      onClick={() => setIsExpanded(false)}
                      className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {ts('cta.close')}
                    </button>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
        whileTap={{ scale: 0.98 }}
        title={ts('title')}
      >
        {isDominantBullish ? (
          <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-500" />
        )}
        <div className="text-sm">
          <span className="font-medium">{dominantPercentage.toFixed(0)}%</span>
          <span className="text-muted-foreground ml-1">{isDominantBullish ? '📈' : '📉'}</span>
        </div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Full-screen backdrop with focus effect (no navbar blur) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed top-0 left-0 right-0 bottom-0 bg-black/30 z-[999999]"
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                width: '100vw',
                height: '100vh',
                maskImage:
                  'linear-gradient(to bottom, transparent 0%, transparent 4rem, black 4rem, black 100%)',
                WebkitMaskImage:
                  'linear-gradient(to bottom, transparent 0%, transparent 4rem, black 4rem, black 100%)',
              }}
              onClick={() => setIsExpanded(false)}
            />

            {/* Dropdown with enhanced positioning */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full right-0 mt-2 w-96 bg-card border border-border rounded-lg p-6 z-[999999] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold">{ts('title')}</h3>
                <span className="text-xs text-muted-foreground ml-auto">
                  {ts('meta.votesToday', { count: totalVotes })}
                </span>
              </div>

              <div className="space-y-4">
                {/* Bullish */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-500" />
                      <span className="text-sm font-medium">{getSentimentLabel('bullish')}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-green-600 dark:text-green-500">
                        {bullishPercentage.toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground ml-1">({stats.bullish.count})</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-green-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${bullishPercentage}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                </div>

                {/* Bearish */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-500" />
                      <span className="text-sm font-medium">{getSentimentLabel('bearish')}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-red-600 dark:text-red-500">
                        {bearishPercentage.toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground ml-1">({stats.bearish.count})</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-red-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${bearishPercentage}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    />
                  </div>
                </div>
              </div>

              {/* Vote Status Message */}
              {voteMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg mt-4 text-sm',
                    userVoteState.hasVoted
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      : 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
                  )}
                >
                  {userVoteState.hasVoted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : isVoting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                    />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                  {voteMessage}
                </motion.div>
              )}

              {/* Voting */}
              {!userVoteState.hasVoted && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-3">{ts('cta.prompt')}</p>
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => handleVote('bullish')}
                      disabled={isVoting}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm rounded-lg transition-all',
                        'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200',
                        'dark:bg-green-900/30 dark:hover:bg-green-900/40 dark:text-green-400 dark:border-green-700',
                        isVoting && 'opacity-50 cursor-not-allowed',
                      )}
                      whileTap={{ scale: isVoting ? 1 : 0.98 }}
                    >
                      <TrendingUp className="w-4 h-4" />
                      {getSentimentLabel('bullish')}
                    </motion.button>
                    <motion.button
                      onClick={() => handleVote('bearish')}
                      disabled={isVoting}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm rounded-lg transition-all',
                        'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200',
                        'dark:bg-red-900/30 dark:hover:bg-red-900/40 dark:text-red-400 dark:border-red-700',
                        isVoting && 'opacity-50 cursor-not-allowed',
                      )}
                      whileTap={{ scale: isVoting ? 1 : 0.98 }}
                    >
                      <TrendingDown className="w-4 h-4" />
                      {getSentimentLabel('bearish')}
                    </motion.button>
                  </div>
                </div>
              )}

              {userVoteState.hasVoted && (
                <div className="mt-4 pt-4 border-t border-border">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                      'flex items-center justify-center gap-2 py-2 px-3 rounded-lg',
                      userVoteState.sentiment === 'bullish'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
                    )}
                  >
                    {userVoteState.sentiment === 'bullish' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {userVoteState.sentiment ? (
                      <span className="text-sm font-medium">
                        {ts('messages.alreadySimple', {
                          sentiment: getSentimentLabel(userVoteState.sentiment),
                        })}
                      </span>
                    ) : null}
                  </motion.div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
