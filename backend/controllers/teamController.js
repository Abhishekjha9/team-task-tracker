const crypto = require('crypto');
const bcrypt = require('bcrypt');
const teamService = require('../services/teamService');
const AppError = require('../utils/AppError');
const { isLead, canAddMember, canManageMember } = require('../utils/permissions');
const { validateMember, parseId } = require('../utils/validators');

const SALT_ROUNDS = 10;
// 12 chars from a URL-safe alphabet; shown once to the admin, then only the hash is stored.
const temporaryPassword = () => crypto.randomBytes(9).toString('base64url');

const forbidden = (msg = 'You do not have permission to perform this action') => new AppError(403, msg);

async function getTeam(req, res) {
  res.json(await teamService.getTeamOverview(req.user.teamId));
}

/** Everyone can see who is on the team; workload numbers are for admins/managers. */
async function listMembers(req, res) {
  res.json({ members: await teamService.listMembers(req.user.teamId, { withStats: isLead(req.user) }) });
}

async function getMember(req, res) {
  const userId = parseId(req.params.userId, 'member');
  const withStats = isLead(req.user) || userId === req.user.id; // members: their own stats only
  const member = await teamService.getMember(req.user.teamId, userId, { withStats });
  if (!member) throw new AppError(404, 'Member not found');
  res.json({ member });
}

async function addMember(req, res) {
  const data = validateMember(req.body);
  if (!canAddMember(req.user, data.role)) throw forbidden('Only admins can add admins');

  const generated = !data.password;
  const password = data.password || temporaryPassword();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const id = await teamService.addMember(req.user.teamId, { ...data, passwordHash });
  const member = await teamService.getMember(req.user.teamId, id, { withStats: true });
  res.status(201).json({ member, ...(generated && { temporaryPassword: password }) });
}

async function updateMember(req, res) {
  const userId = parseId(req.params.userId, 'member');
  const data = validateMember(req.body, { partial: true });
  if (userId === req.user.id && data.role && data.role !== req.user.role && req.user.role !== 'admin') {
    throw forbidden('You cannot change your own role');
  }
  const found = await teamService.updateMember(req.user.teamId, userId, data, (target) => {
    if (!canManageMember(req.user, target, data.role)) throw forbidden('Managers cannot modify admins or grant the admin role');
  });
  if (!found) throw new AppError(404, 'Member not found');
  res.json({ member: await teamService.getMember(req.user.teamId, userId, { withStats: true }) });
}

async function removeMember(req, res) {
  const userId = parseId(req.params.userId, 'member');
  if (userId === req.user.id) throw new AppError(400, 'You cannot remove yourself from the team');
  const raw = req.body?.reassignTo ?? req.query.reassignTo;
  const reassignTo = raw === undefined || raw === null || raw === '' ? null : parseId(raw, 'reassignment target');

  const result = await teamService.removeMember(req.user.teamId, userId, {
    reassignTo,
    authorize: (target) => {
      if (!canManageMember(req.user, target)) throw forbidden('Managers cannot remove admins');
    },
  });
  if (!result) throw new AppError(404, 'Member not found');
  res.json({ message: 'Member removed', ...result });
}

module.exports = { getTeam, listMembers, getMember, addMember, updateMember, removeMember };
