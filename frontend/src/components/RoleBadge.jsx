import { ROLE_STYLES } from '../utils/permissions';

export default function RoleBadge({ role }) {
  if (!role) return null;
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ROLE_STYLES[role]}`}>{role}</span>;
}
