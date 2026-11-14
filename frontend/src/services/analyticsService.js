import api from './api';

const clean = (p) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v != null));
const get = (path, params, config) => api.get(`/analytics/${path}`, { params: clean(params), ...config }).then((r) => r.data.data);

export const analyticsService = {
  overview: (p, c) => get('overview', p, c),
  distribution: (p, c) => get('task-distribution', p, c),
  workload: (p, c) => get('team-workload', p, c),
  trends: (p, c) => get('completion-trends', p, c),
};
