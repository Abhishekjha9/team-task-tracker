import api from './api';

export const authService = {
  signup: (payload) => api.post('/auth/signup', payload).then((r) => r.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data.user),
};
