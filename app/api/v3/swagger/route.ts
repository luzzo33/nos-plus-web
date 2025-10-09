import { NextResponse } from 'next/server';

import spec from '@/openapi/nos-plus-v3';

export function GET() {
  return NextResponse.json(spec, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
