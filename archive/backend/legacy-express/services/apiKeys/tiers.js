const NodeCache = require('node-cache');
const { generalDbPool } = require('../../config/db');

const cache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

function normaliseTier(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    monthlyQuota: row.monthly_quota,
    burstRpm: row.burst_rpm,
    softWarningPct: row.soft_warning_pct,
    hardBlockPct: row.hard_block_pct,
    overagePolicy: row.overage_policy,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  };
}

async function getTierById(id) {
  if (!id) return null;
  const cacheKey = `tier:${id}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const [rows] = await generalDbPool.query('SELECT * FROM api_tiers WHERE id = ? LIMIT 1', [id]);
  if (!rows.length) {
    cache.set(cacheKey, null, 60);
    return null;
  }
  const tier = normaliseTier(rows[0]);
  cache.set(cacheKey, tier, 300);
  cache.set(`tier-slug:${tier.slug}`, tier, 300);
  return tier;
}

async function getTierBySlug(slug) {
  if (!slug) return null;
  const cacheKey = `tier-slug:${slug}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const [rows] = await generalDbPool.query('SELECT * FROM api_tiers WHERE slug = ? LIMIT 1', [
    slug,
  ]);
  if (!rows.length) {
    cache.set(cacheKey, null, 60);
    return null;
  }
  const tier = normaliseTier(rows[0]);
  cache.set(cacheKey, tier, 300);
  cache.set(`tier:${tier.id}`, tier, 300);
  return tier;
}

async function listTiers() {
  if (cache.has('tiers:all')) return cache.get('tiers:all');
  const [rows] = await generalDbPool.query('SELECT * FROM api_tiers ORDER BY id ASC');
  const tiers = rows.map(normaliseTier);
  cache.set('tiers:all', tiers, 300);
  tiers.forEach((tier) => {
    cache.set(`tier:${tier.id}`, tier, 300);
    cache.set(`tier-slug:${tier.slug}`, tier, 300);
  });
  return tiers;
}

async function ensureDefaultTiers() {
  const [rows] = await generalDbPool.query('SELECT COUNT(*) AS total FROM api_tiers');
  if (rows[0].total > 0) return;

  const defaults = [
    {
      slug: 'free',
      name: 'Free Tier',
      description: 'Starter access with limited quota.',
      monthlyQuota: 10000,
      burstRpm: 120,
      softWarningPct: 80,
      hardBlockPct: 100,
      overagePolicy: 'block',
    },
    {
      slug: 'pro',
      name: 'Pro Tier',
      description: 'Higher limits for active traders.',
      monthlyQuota: 250000,
      burstRpm: 600,
      softWarningPct: 85,
      hardBlockPct: 110,
      overagePolicy: 'notify',
    },
  ];

  const insertSql = `INSERT INTO api_tiers (slug, name, description, monthly_quota, burst_rpm, soft_warning_pct, hard_block_pct, overage_policy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  for (const tier of defaults) {
    await generalDbPool.execute(insertSql, [
      tier.slug,
      tier.name,
      tier.description,
      tier.monthlyQuota,
      tier.burstRpm,
      tier.softWarningPct,
      tier.hardBlockPct,
      tier.overagePolicy,
    ]);
  }
  cache.flushAll();
}

module.exports = {
  getTierById,
  getTierBySlug,
  listTiers,
  ensureDefaultTiers,
};
