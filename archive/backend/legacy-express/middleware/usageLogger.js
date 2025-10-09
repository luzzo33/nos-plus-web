const { recordUsageEvent } = require('../services/apiKeys/usage');

function usageLogger(req, res, next) {
  if (!req.apiConsumer) return next();

  const start = process.hrtime.bigint();
  const apiKeyId = req.apiConsumer.id;
  const routeLabel = req.route?.path || req.originalUrl || req.url;

  function finalize() {
    res.removeListener('finish', finalize);
    res.removeListener('close', finalize);
    res.removeListener('error', finalize);

    const statusCode = res.statusCode;
    const latencyNs = process.hrtime.bigint() - start;
    const latencyMs = Number(latencyNs / 1000000n);

    recordUsageEvent({
      apiKeyId,
      route: routeLabel,
      method: req.method,
      statusCode,
      latencyMs,
      bytesIn: Number(req.headers['content-length'] || 0) || null,
      bytesOut: Number(res.getHeader('content-length')) || null,
      errorCode: statusCode >= 400 ? res.locals?.errorCode || null : null,
    }).catch(() => {});
  }

  res.on('finish', finalize);
  res.on('close', finalize);
  res.on('error', finalize);

  return next();
}

module.exports = usageLogger;
