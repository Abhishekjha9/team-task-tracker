const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware');
const auth = require('../controllers/authController');

router.post('/signup', asyncHandler(auth.signup));
router.post('/login', asyncHandler(auth.login));
router.get('/me', protect, asyncHandler(auth.me));

module.exports = router;
