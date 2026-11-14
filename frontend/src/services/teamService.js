import api from './api';

export const teamService = {
  get: () => api.get('/team').then((r) => r.data),
  members: () => api.get('/team/members').then((r) => r.data.members),
  member: (id) => api.get(`/team/members/${id}`).then((r) => r.data.member),
  addMember: (payload) => api.post('/team/members', payload).then((r) => r.data),
  updateMember: (id, changes) => api.put(`/team/members/${id}`, changes).then((r) => r.data.member),
  removeMember: (id, reassignTo) => api.delete(`/team/members/${id}`, { data: { reassignTo: reassignTo || null } }).then((r) => r.data),
};
