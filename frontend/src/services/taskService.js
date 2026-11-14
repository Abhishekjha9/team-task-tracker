import api from './api';

// Drop empty filters so the URL only carries meaningful query params.
const clean = (params) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));

export const taskService = {
  list: (params, config) => api.get('/tasks', { params: clean(params), ...config }).then((r) => r.data),
  stats: () => api.get('/tasks/stats').then((r) => r.data),
  get: (id) => api.get(`/tasks/${id}`).then((r) => r.data),
  create: (task) => api.post('/tasks', task).then((r) => r.data),
  update: (id, changes) => api.put(`/tasks/${id}`, changes).then((r) => r.data),
  remove: (id) => api.delete(`/tasks/${id}`).then((r) => r.data),
};
