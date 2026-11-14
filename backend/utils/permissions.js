/**
 * Single source of truth for role-based authorization. Every rule here is enforced on the
 * server; the frontend only uses the computed flags to decide which controls to show.
 *
 * `user` is always req.user, built by authMiddleware from the DATABASE (never from the
 * request body or token claims): { id, teamId, role }.
 */
const ROLES = ['admin', 'manager', 'member'];
const isAdmin = (u) => u.role === 'admin';
const isLead = (u) => u.role === 'admin' || u.role === 'manager'; // sees the whole team

/**
 * SQL fragment limiting tasks to what `user` may see.
 *  - admin/manager: every task in their team
 *  - member: tasks in their team assigned to them or created by them
 * scope='me' narrows anyone to the member rule ("My tasks").
 */
function taskScope(user, { alias = 't', scope = isLead(user) ? 'team' : 'me' } = {}) {
  if (scope === 'team' && isLead(user)) return { sql: `${alias}.team_id = ?`, params: [user.teamId] };
  return {
    sql: `${alias}.team_id = ? AND (${alias}.assigned_to = ? OR ${alias}.created_by = ?)`,
    params: [user.teamId, user.id, user.id],
  };
}

/** What `user` may do with a task they can already see. */
function taskPermissions(user, task) {
  if (isAdmin(user)) return { canEdit: true, canDelete: true, canAssign: true, canChangeStatus: true };
  const own = task.created_by === user.id;
  const mine = task.assigned_to === user.id;
  if (user.role === 'manager') return { canEdit: true, canDelete: own, canAssign: true, canChangeStatus: true };
  // member: full edit of tasks they created; only status on tasks someone assigned to them.
  return { canEdit: own, canDelete: own, canAssign: own, canChangeStatus: own || mine };
}

/** Members may only assign to themselves or leave unassigned. Leads: anyone in the team. */
/**
 * "My tasks" for analytics: what the user is responsible for — tasks assigned to them, plus
 * tasks they created that nobody owns yet. Always a subset of taskScope(), so it never widens access.
 */
function myTasksScope(user, alias = 't') {
  return {
    sql: `${alias}.team_id = ? AND (${alias}.assigned_to = ? OR (${alias}.assigned_to IS NULL AND ${alias}.created_by = ?))`,
    params: [user.teamId, user.id, user.id],
  };
}

const canAssignTo = (user, assigneeId) => isLead(user) || assigneeId === null || assigneeId === user.id;

const canAddMember = (actor, role) => isAdmin(actor) || (actor.role === 'manager' && role !== 'admin');

/** Can `actor` edit/remove `target` (a membership row with .role), optionally giving it `newRole`? */
function canManageMember(actor, target, newRole) {
  if (isAdmin(actor)) return true;
  if (actor.role !== 'manager') return false;
  return target.role !== 'admin' && newRole !== 'admin';
}

module.exports = { ROLES, isAdmin, isLead, taskScope, myTasksScope, taskPermissions, canAssignTo, canAddMember, canManageMember };
