import { NextRequest, NextResponse } from 'next/server';

let mockVotes: Array<{
  id: number;
  sentiment: 'bullish' | 'bearish';
  ip: string;
  created_at: string;
}> = [];

if (process.env.NODE_ENV === 'development' && mockVotes.length === 0) {
  const now = new Date();
  const today = new Date().toISOString();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

  mockVotes = [
    { id: 1, sentiment: 'bullish', ip: '192.168.1.1', created_at: today },
    { id: 2, sentiment: 'bullish', ip: '192.168.1.2', created_at: today },
    { id: 3, sentiment: 'bullish', ip: '192.168.1.3', created_at: today },
    { id: 4, sentiment: 'bullish', ip: '192.168.1.4', created_at: today },
    { id: 5, sentiment: 'bearish', ip: '192.168.1.5', created_at: today },
    { id: 6, sentiment: 'bearish', ip: '192.168.1.6', created_at: today },

    { id: 7, sentiment: 'bullish', ip: '192.168.1.7', created_at: yesterday },
    { id: 8, sentiment: 'bearish', ip: '192.168.1.8', created_at: yesterday },
    { id: 9, sentiment: 'bearish', ip: '192.168.1.9', created_at: yesterday },

    { id: 10, sentiment: 'bullish', ip: '192.168.1.10', created_at: twoDaysAgo },
  ];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '24h';

    const now = new Date();
    let cutoffTime: Date;

    switch (period) {
      case '7d':
        cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '24h':
      default:
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
    }

    const filteredVotes = mockVotes.filter((vote) => new Date(vote.created_at) >= cutoffTime);

    const bullishCount = filteredVotes.filter((vote) => vote.sentiment === 'bullish').length;
    const bearishCount = filteredVotes.filter((vote) => vote.sentiment === 'bearish').length;
    const totalVotes = filteredVotes.length;

    const bullishPercentage = totalVotes > 0 ? (bullishCount / totalVotes) * 100 : 0;
    const bearishPercentage = totalVotes > 0 ? (bearishCount / totalVotes) * 100 : 0;

    const lastUpdate =
      filteredVotes.length > 0
        ? filteredVotes.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )[0].created_at
        : null;

    const stats = {
      total: totalVotes,
      bullish: {
        count: bullishCount,
        percentage: Math.round(bullishPercentage * 100) / 100,
      },
      bearish: {
        count: bearishCount,
        percentage: Math.round(bearishPercentage * 100) / 100,
      },
      period: period,
      lastUpdate: lastUpdate,
    };

    return NextResponse.json({
      success: true,
      stats,
      meta: {
        timestamp: new Date().toISOString(),
        type: 'stats',
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Internal server error',
          code: 500,
        },
      },
      { status: 500 },
    );
  }
}
