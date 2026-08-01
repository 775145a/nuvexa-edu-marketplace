export interface SlowRequest {
  route: string;
  ms: number;
  at: string;
}

export const metrics = {
  startedAt: Date.now(),
  totalRequests: 0,
  errors: 0,
  byStatus: {} as Record<string, number>,
  byRoute: {} as Record<string, number>,
  slowRequests: [] as SlowRequest[],
};

export function recordRequest(route: string, status: number, ms: number): void {
  metrics.totalRequests++;
  metrics.byStatus[String(status)] = (metrics.byStatus[String(status)] || 0) + 1;
  metrics.byRoute[route] = (metrics.byRoute[route] || 0) + 1;
  if (status >= 500) metrics.errors++;
  if (ms > 1000) {
    metrics.slowRequests.push({ route, ms: Math.round(ms), at: new Date().toISOString() });
    if (metrics.slowRequests.length > 100) metrics.slowRequests.shift();
  }
}

export function getMetricsSnapshot() {
  return {
    uptime: Math.round((Date.now() - metrics.startedAt) / 1000),
    totalRequests: metrics.totalRequests,
    errors: metrics.errors,
    errorRatePct:
      metrics.totalRequests === 0
        ? 0
        : Math.round((metrics.errors / metrics.totalRequests) * 10000) / 100,
    byStatus: metrics.byStatus,
    topRoutes: Object.entries(metrics.byRoute)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15),
    slowRequests: metrics.slowRequests,
  };
}
