import { NextRequest, NextResponse } from 'next/server';

let mockVotes: Array<{
  id: number;
  sentiment: 'bullish' | 'bearish';
  ip: string;
  created_at: string;
}> = [];

let nextId = 1;

export async function POST(request: NextRequest) {
  try {
    const { sentiment } = await request.json();

    if (!sentiment || !['bullish', 'bearish'].includes(sentiment)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Sentiment must be either "bullish" or "bearish"',
            code: 400,
          },
        },
        { status: 400 },
      );
    }

    const ip =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

    const today = new Date().toDateString();

    const existingVoteIndex = mockVotes.findIndex(
      (vote) => vote.ip === ip && new Date(vote.created_at).toDateString() === today,
    );

    if (existingVoteIndex !== -1) {
      const existingVote = mockVotes[existingVoteIndex];

      if (existingVote.sentiment === sentiment) {
        return NextResponse.json({
          success: true,
          message: 'Vote already recorded for today',
          vote: {
            id: existingVote.id,
            sentiment: existingVote.sentiment,
            created_at: existingVote.created_at,
          },
          alreadyVoted: true,
        });
      } else {
        mockVotes[existingVoteIndex] = {
          ...existingVote,
          sentiment,
          created_at: new Date().toISOString(),
        };

        return NextResponse.json({
          success: true,
          message: 'Vote updated successfully',
          vote: {
            id: existingVote.id,
            sentiment,
            created_at: existingVote.created_at,
          },
          updated: true,
        });
      }
    }

    const newVote = {
      id: nextId++,
      sentiment,
      ip,
      created_at: new Date().toISOString(),
    };

    mockVotes.push(newVote);

    return NextResponse.json({
      success: true,
      message: 'Vote submitted successfully',
      vote: {
        id: newVote.id,
        sentiment: newVote.sentiment,
        created_at: newVote.created_at,
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

if (process.env.NODE_ENV === 'development' && mockVotes.length === 0) {
  const now = new Date();
  const today = new Date().toISOString();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  mockVotes = [
    { id: 1, sentiment: 'bullish', ip: '192.168.1.1', created_at: today },
    { id: 2, sentiment: 'bullish', ip: '192.168.1.2', created_at: today },
    { id: 3, sentiment: 'bullish', ip: '192.168.1.3', created_at: today },
    { id: 4, sentiment: 'bearish', ip: '192.168.1.4', created_at: today },
    { id: 5, sentiment: 'bullish', ip: '192.168.1.5', created_at: yesterday },
    { id: 6, sentiment: 'bearish', ip: '192.168.1.6', created_at: yesterday },
  ];
  nextId = 7;
}
