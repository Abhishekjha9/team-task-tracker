const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { protect, requireRole } = require('../middleware/authMiddleware');
const team = require('../controllers/teamController');

router.use(protect);

router.get('/', asyncHandler(team.getTeam));
router.get('/members', asyncHandler(team.listMembers));
router.post('/members', requireRole('admin', 'manager'), asyncHandler(team.addMember));
router.get('/members/:userId', asyncHandler(team.getMember));
router.put('/members/:userId', requireRole('admin', 'manager'), asyncHandler(team.updateMember));
router.delete('/members/:userId', requireRole('admin', 'manager'), asyncHandler(team.removeMember));

module.exports = router;
