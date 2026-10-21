export function createTelemetry({
  clock = Date.now,
  logger = console.log,
  enabled = false
} = {}) {
  let requests = 0,
    errors = 0;
  const recent = [];
  return {
    observe(req, res, id) {
      const start = clock();
      res.once('finish', () => {
        const duration = Math.max(0, clock() - start);
        requests++;
        if (res.statusCode >= 500) errors++;
        recent.push(duration);
        if (recent.length > 1000) recent.shift();
        if (enabled) logger(JSON.stringify({
          event: 'http.request',
          id,
          method: req.method,
          path: String(req.url || '').split('?')[0],
          status: res.statusCode,
          durationMs: duration
        }));
      });
    },
    snapshot() {
      const sorted = [...recent].sort((a, b) => a - b);
      return {
        requests,
        serverErrors: errors,
        p95Ms: sorted[Math.max(0, Math.ceil(sorted.length * .95) - 1)] || 0,
        uptimeSeconds: Math.round(process.uptime()),
        memoryMb: Math.round(process.memoryUsage().rss / 1048576)
      };
    }
  };
}
