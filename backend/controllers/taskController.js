const taskService = require('../services/taskService');
const AppError = require('../utils/AppError');
const { validateTask, validateListQuery, parseId } = require('../utils/validators');

async function listTasks(req, res) {
  const query = validateListQuery(req.query, req.user.id);
  res.json(await taskService.listTasks(req.user, query));
}

async function getStats(req, res) {
  res.json(await taskService.getStats(req.user));
}

async function getTask(req, res) {
  const task = await taskService.getTaskById(req.user, parseId(req.params.id));
  if (!task) throw new AppError(404, 'Task not found');
  res.json(task);
}

async function createTask(req, res) {
  const data = validateTask(req.body);
  const task = await taskService.createTask(req.user, data);
  res.status(201).json(task);
}

async function updateTask(req, res) {
  const id = parseId(req.params.id);
  const data = validateTask(req.body, { partial: true });
  const task = await taskService.updateTask(req.user, id, data);
  if (!task) throw new AppError(404, 'Task not found');
  res.json(task);
}

async function deleteTask(req, res) {
  const deleted = await taskService.deleteTask(req.user, parseId(req.params.id));
  if (!deleted) throw new AppError(404, 'Task not found');
  res.json({ message: 'Task deleted' });
}

module.exports = { listTasks, getStats, getTask, createTask, updateTask, deleteTask };
