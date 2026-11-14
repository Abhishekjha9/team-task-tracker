import { useCallback, useEffect, useRef, useState } from 'react';
import { analyticsService } from '../services/analyticsService';
import { getErrorMessage } from '../services/api';

/** Loads all dashboard analytics in parallel for a scope + date range. Aggregation is server-side. */
export function useAnalytics({ scope, from, to, trendFrom, includeWorkload }) {
  const [state, setState] = useState({ loading: true, error: null, overview: null, distribution: null, workload: null, trends: null });
  const [reloadKey, setReloadKey] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const controller = new AbortController();
    const params = { scope, from, to };
    const cfg = { signal: controller.signal };
    setState((s) => ({ ...s, loading: true, error: null }));

    Promise.all([
      analyticsService.overview(params, cfg),
      analyticsService.distribution(params, cfg),
      includeWorkload ? analyticsService.workload(params, cfg) : Promise.resolve(null),
      // Trends always need a bounded window (the API defaults to 30 days without one).
      analyticsService.trends({ ...params, from: trendFrom || from }, cfg),
    ])
      .then(([overview, distribution, workload, trends]) => {
        if (id === requestId.current) setState({ loading: false, error: null, overview, distribution, workload, trends });
      })
      .catch((err) => {
        if (err.code === 'ERR_CANCELED' || id !== requestId.current) return;
        setState((s) => ({ ...s, loading: false, error: getErrorMessage(err, 'Could not load analytics.') }));
      });
    return () => controller.abort();
  }, [scope, from, to, trendFrom, includeWorkload, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { ...state, reload };
}
