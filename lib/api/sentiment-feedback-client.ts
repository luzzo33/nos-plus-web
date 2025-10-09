import { BaseApiClient } from './base-client';
import { buildNosApiUrl } from './monitorConfig';

export interface SentimentStats {
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

export interface VoteResponse {
  success: boolean;
  message: string;
  vote: {
    id: number;
    sentiment: 'bullish' | 'bearish';
    created_at: string;
  };
  alreadyVoted?: boolean;
  updated?: boolean;
}

export interface SentimentStatsResponse {
  success: boolean;
  stats: SentimentStats;
  meta: {
    timestamp: string;
    type: string;
  };
}

export class SentimentFeedbackApiClient extends BaseApiClient {
  constructor() {
    super(buildNosApiUrl('/v3/sentiment-feedback'), 'SentimentFeedback');
  }

  /**
   * Submit a sentiment vote (bullish or bearish)
   */
  async submitVote(sentiment: 'bullish' | 'bearish'): Promise<VoteResponse> {
    try {
      const response = await this.axiosInstance.post('/vote', { sentiment });
      const data = response.data;

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to submit vote');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current sentiment statistics
   */
  async getStats(
    params: {
      period?: '24h' | '7d' | '30d';
    } = {},
  ): Promise<SentimentStatsResponse> {
    try {
      const response = await this.axiosInstance.get('/stats', { params });
      const data = response.data;

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch sentiment statistics');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if user has voted today based on localStorage
   */
  getUserVoteStatus(): { voted: boolean; sentiment?: 'bullish' | 'bearish'; date?: string } {
    try {
      const today = new Date().toDateString();
      const lastVote = localStorage.getItem('nos-sentiment-vote');

      if (lastVote) {
        const voteData = JSON.parse(lastVote);
        if (voteData.date === today) {
          return {
            voted: true,
            sentiment: voteData.sentiment,
            date: voteData.date,
          };
        }
      }

      return { voted: false };
    } catch {
      return { voted: false };
    }
  }

  /**
   * Store user vote in localStorage to prevent duplicate votes
   */
  storeUserVote(sentiment: 'bullish' | 'bearish'): void {
    try {
      const today = new Date().toDateString();
      localStorage.setItem(
        'nos-sentiment-vote',
        JSON.stringify({
          sentiment,
          date: today,
          timestamp: new Date().toISOString(),
        }),
      );
    } catch {}
  }

  /**
   * Clear user vote from localStorage (useful for testing)
   */
  clearUserVote(): void {
    try {
      localStorage.removeItem('nos-sentiment-vote');
    } catch {}
  }
}
