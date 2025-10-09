const NodeCache = require('node-cache');
const { generalDbPool } = require('../../config/db');

const latestUsageCache = new NodeCache({ stdTTL: 30, checkperiod: 60 });

async function recordUsageEvent({
  apiKeyId,
  route,
  method,
  statusCode,
  latencyMs,
  bytesIn,
  bytesOut,
  errorCode = null,
  meta = null,
}) {
  if (!apiKeyId) return;
  await generalDbPool.execute(
    `INSERT INTO api_usage_events (api_key_id, route, method, status_code, latency_ms, bytes_in, bytes_out, error_code, meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      apiKeyId,
      route || null,
      method || null,
      statusCode || null,
      latencyMs || null,
      bytesIn || null,
      bytesOut || null,
      errorCode || null,
      meta ? JSON.stringify(meta) : null,
    ],
  );
  latestUsageCache.set(apiKeyId, Date.now());
}

async function fetchUsageSummary(apiKeyId, sinceMinutes = 60) {
  if (!apiKeyId) return null;
  const [rows] = await generalDbPool.query(
    `SELECT
       COUNT(*) AS total_calls,
       SUM(CASE WHEN status_code BETWEEN 200 AND 399 THEN 1 ELSE 0 END) AS success_calls,
       SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS error_calls,
       AVG(latency_ms) AS avg_latency_ms
     FROM api_usage_events
     WHERE api_key_id = ? AND occurred_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? MINUTE)`,
    [apiKeyId, sinceMinutes],
  );
  return rows.length
    ? rows[0]
    : { total_calls: 0, success_calls: 0, error_calls: 0, avg_latency_ms: null };
}

async function listRecentEvents(apiKeyId, limit = 100) {
  if (!apiKeyId) return [];
  const [rows] = await generalDbPool.query(
    `SELECT id, occurred_at, route, method, status_code, latency_ms, error_code
     FROM api_usage_events
     WHERE api_key_id = ?
     ORDER BY occurred_at DESC
     LIMIT ?`,
    [apiKeyId, Number(limit) || 100],
  );
  return rows;
}

async function fetchDailyUsage(apiKeyId, days = 30) {
  if (!apiKeyId) return [];
  const [rows] = await generalDbPool.query(
    `SELECT
       DATE(occurred_at) AS day,
       COUNT(*) AS total_calls,
       SUM(CASE WHEN status_code BETWEEN 200 AND 399 THEN 1 ELSE 0 END) AS success_calls,
       SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS error_calls,
       AVG(latency_ms) AS avg_latency_ms
     FROM api_usage_events
     WHERE api_key_id = ? AND occurred_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)
     GROUP BY day
     ORDER BY day DESC
     LIMIT ?`,
    [apiKeyId, Number(days) || 30, Number(days) || 30],
  );
  return rows;
}

module.exports = {
  recordUsageEvent,
  fetchUsageSummary,
  listRecentEvents,
  fetchDailyUsage,
};
