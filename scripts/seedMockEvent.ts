import { randomUUID } from 'node:crypto';

import { env } from '../src/config/env.js';
import { destroyDb, getDb } from '../src/db/index.js';
import { createAlertPipeline } from '../src/alerts/index.js';
import { EventProcessor } from '../src/services/eventProcessor.js';
import type { NormalizedEventPayload } from '../src/ingestion/types.js';
import { logger } from '../src/utils/logger.js';

async function main() {
  logger.info('Seeding mock normalized event');

  const db = getDb();
  const processor = new EventProcessor(db);
  const alertPipeline = createAlertPipeline(db);

  const mockEvent: NormalizedEventPayload = {
    externalId: randomUUID(),
    txHash: null,
    market: {
      venueSlug: 'raydium-nos-usdc',
      symbol: 'NOS/USDC',
      venueType: 'dex',
      metadata: {
        address: 'raydium_pool_address',
      },
    },
    kind: 'trade',
    side: 'buy',
    baseAmount: 15000,
    quoteAmount: 30000,
    usdValue: 30000,
    price: 2,
    participants: [
      {
        address: 'wallet_taker_mock',
        role: 'taker',
        chain: 'solana',
        amount: 15000,
      },
      {
        address: 'wallet_maker_mock',
        role: 'maker',
        chain: 'solana',
        amount: 15000,
      },
    ],
    occurredAt: new Date(),
    metadata: {
      source: 'seed-script',
    },
    rawEventType: 'trade',
    source: 'manual',
  };

  const normalizedEventId = await processor.handle(mockEvent);
  logger.info({ normalizedEventId }, 'Mock event processed');

  await alertPipeline(normalizedEventId);

  logger.info('Alert pipeline executed for mock event');
  await destroyDb();
}

main().catch(async (error) => {
  logger.error({ err: error }, 'Failed to seed mock event');
  await destroyDb();
  process.exit(1);
});
