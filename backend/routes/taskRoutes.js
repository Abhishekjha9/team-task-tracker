const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware');
const tasks = require('../controllers/taskController');

router.use(protect);

router.route('/').get(asyncHandler(tasks.listTasks)).post(asyncHandler(tasks.createTask));
router.get('/stats', asyncHandler(tasks.getStats)); // must precede /:id
router
  .route('/:id')
  .get(asyncHandler(tasks.getTask))
  .put(asyncHandler(tasks.updateTask))
  .delete(asyncHandler(tasks.deleteTask));

module.exports = router;
