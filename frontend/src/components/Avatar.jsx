// eslint-disable-next-line react-refresh/only-export-components
export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';

const TONES = ['avatar-0', 'avatar-1', 'avatar-2', 'avatar-3', 'avatar-4', 'avatar-5'];

/** Initials avatar; tint is stable per user id so people are recognisable across views. */
export default function Avatar({ user, size = 'md', className = '' }) {
  const dims = { xs: 'size-5 text-[9px]', sm: 'size-6 text-[10px]', md: 'size-8 text-xs', lg: 'size-12 text-base' }[size];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-line ${dims} ${TONES[(user?.id ?? 0) % TONES.length]} ${className}`} aria-hidden="true">
      {initials(user?.name)}
    </span>
  );
}
