const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware');
const analytics = require('../controllers/analyticsController');

router.use(protect);

router.get('/overview', asyncHandler(analytics.overview));
router.get('/task-distribution', asyncHandler(analytics.taskDistribution));
router.get('/team-workload', asyncHandler(analytics.teamWorkload));
router.get('/completion-trends', asyncHandler(analytics.completionTrends));

module.exports = router;
