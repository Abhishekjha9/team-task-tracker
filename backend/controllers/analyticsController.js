const analytics = require('../services/analyticsService');
const AppError = require('../utils/AppError');
const { isLead } = require('../utils/permissions');
const { validateAnalyticsQuery } = require('../utils/validators');

/** Resolves the effective scope: leads default to the team; members are limited to 'me'. */
function resolve(req, opts) {
  const q = validateAnalyticsQuery(req.query, opts);
  if (q.scope === 'team' && !isLead(req.user)) throw new AppError(403, 'Only admins and managers can view team-wide analytics');
  return { ...q, scope: q.scope || (isLead(req.user) ? 'team' : 'me') };
}

const handler = (fn, opts) => async (req, res) => {
  const q = resolve(req, opts);
  res.json({ scope: q.scope, from: q.from, to: q.to, data: await fn(req.user, q) });
};

module.exports = {
  overview: handler(analytics.overview),
  taskDistribution: handler(analytics.taskDistribution),
  teamWorkload: handler(analytics.teamWorkload),
  completionTrends: handler(analytics.completionTrends, { defaultDays: 30 }),
};
