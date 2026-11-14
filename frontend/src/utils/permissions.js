// UI-side mirror of backend/utils/permissions.js. Only decides what to SHOW;
// the API re-checks every action.
export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', description: 'Full access, manages members and roles' },
  { value: 'manager', label: 'Manager', description: 'Manages team tasks and assignments' },
  { value: 'member', label: 'Member', description: 'Works on tasks assigned to them' },
];

export const ROLE_STYLES = {
  admin: 'tone-accent',
  manager: 'tone-todo',
  member: 'tone-neutral',
};

export const isLead = (user) => user?.role === 'admin' || user?.role === 'manager';
export const canAddMember = (user) => isLead(user);
export const assignableRoles = (user) => (user?.role === 'admin' ? ROLE_OPTIONS : ROLE_OPTIONS.filter((r) => r.value !== 'admin'));

export function canManageMember(actor, target) {
  if (!actor || !target) return false;
  if (actor.role === 'admin') return true;
  return actor.role === 'manager' && target.role !== 'admin';
}
