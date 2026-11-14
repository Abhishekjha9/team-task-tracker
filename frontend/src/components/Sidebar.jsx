import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronsLeft, ChevronsRight, LayoutDashboard, ListChecks, LogOut, MoreVertical, Settings, Users, X } from 'lucide-react';
import Logo from './Logo';
import Avatar from './Avatar';
import DropdownMenu from './ui/DropdownMenu';
import { useAuth } from '../context/AuthContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { SIDEBAR_WIDTH, spring } from '../utils/motion';

const SECTIONS = [
  {
    title: 'Main menu',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/tasks', label: 'My Tasks', icon: ListChecks },
      { to: '/team', label: 'Team', icon: Users },
    ],
  },
  { title: 'Workspace', items: [{ to: '/settings', label: 'Settings', icon: Settings }] },
];

const fadeLabel = {
  initial: { opacity: 0, x: -6 },
  animate: { opacity: 1, x: 0, transition: { delay: 0.06, duration: 0.18 } },
  exit: { opacity: 0, x: -6, transition: { duration: 0.08 } },
};

/** Tooltip shown next to an icon when the sidebar is collapsed. */
function Tip({ show, children }) {
  if (!show) return null;
  return (
    <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-md border border-line bg-elevated px-2 py-1 text-xs font-medium text-fg opacity-0 shadow-[var(--shadow-pop)] transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
      {children}
    </span>
  );
}

export default function Sidebar({ open, onClose, collapsed, onToggleCollapsed }) {
  const { user, logout } = useAuth();
  const desktop = useIsDesktop();
  const mini = desktop && collapsed; // the mobile drawer is always full width

  return (
    <>
      <AnimatePresence>
        {!desktop && open && (
          <motion.div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px]" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
        )}
      </AnimatePresence>
      <motion.aside
        aria-label="Main navigation"
        initial={false}
        animate={desktop ? { x: 0, width: mini ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded } : { x: open ? 0 : '-100%', width: SIDEBAR_WIDTH.expanded }}
        transition={spring}
        className="fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-line bg-sidebar"
      >
        {/* Brand */}
        <div className={`flex h-[72px] shrink-0 items-center px-5 ${mini ? 'justify-center px-0' : 'justify-between'}`}>
          <Logo compact={mini} />
          {!desktop && <button type="button" className="icon-btn size-8" onClick={onClose} aria-label="Close menu"><X className="size-4" /></button>}
          {desktop && !mini && (
            <button type="button" className="icon-btn size-8" onClick={onToggleCollapsed} aria-label="Collapse sidebar" title="Collapse sidebar">
              <ChevronsLeft className="size-4" />
            </button>
          )}
        </div>

        {mini && (
          <div className="flex justify-center pb-2">
            <button type="button" className="group icon-btn relative size-8" onClick={onToggleCollapsed} aria-label="Expand sidebar">
              <ChevronsRight className="size-4" />
              <Tip show>Expand sidebar</Tip>
            </button>
          </div>
        )}

        <AnimatePresence initial={false}>
          {!mini && (
            <motion.div key="team" {...fadeLabel} className="mx-3 mb-3 rounded-xl border border-line bg-surface px-3 py-2">
              <p className="eyebrow">Team</p>
              <p className="truncate text-sm font-medium text-fg" title={user?.team?.name}>{user?.team?.name}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <nav className={`flex-1 px-3 py-1 ${mini ? 'overflow-visible' : 'overflow-y-auto'}`}>
          {SECTIONS.map((section) => (
            <div key={section.title} className="mb-5">
              <p className={`eyebrow mb-2 h-4 whitespace-nowrap px-3 ${mini ? 'sr-only' : ''}`}>{section.title}</p>
              <ul className="space-y-1">
                {section.items.map(({ to, label, icon: Icon, end }) => (
                  <li key={to}>
                    <NavLink to={to} end={end} onClick={onClose} aria-label={mini ? label : undefined}
                      className={({ isActive }) =>
                        `group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors duration-200 ${mini ? 'justify-center px-0' : ''} ${isActive ? 'font-medium text-fg' : 'text-fg-2 hover:bg-surface-2/70 hover:text-fg'}`}
                    >
                      {({ isActive }) => (
                        <>
                          {/* Shared layoutId: the highlight glides to the newly active item. */}
                          {isActive && <motion.span layoutId="nav-active" transition={spring} className="absolute inset-0 rounded-xl border border-line-strong bg-surface-2 shadow-[var(--shadow-card)]" />}
                          {isActive && <motion.span layoutId="nav-bar" transition={spring} className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent" />}
                          <Icon className={`relative size-[18px] shrink-0 ${isActive ? 'text-accent-text' : ''}`} />
                          <AnimatePresence initial={false}>
                            {!mini && <motion.span key="label" {...fadeLabel} className="relative whitespace-nowrap">{label}</motion.span>}
                          </AnimatePresence>
                          <Tip show={mini}>{label}</Tip>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* User profile */}
        <div className="shrink-0 border-t border-line p-3">
          <div className={`flex items-center gap-3 rounded-xl px-2 py-2 ${mini ? 'flex-col px-0' : ''}`}>
            <Avatar user={user} className="size-9" />
            <AnimatePresence initial={false}>
              {!mini && (
                <motion.div key="who" {...fadeLabel} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{user?.name}</p>
                  <p className="truncate text-xs text-fg-3">{user?.email}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <DropdownMenu
              label="Account"
              align={mini ? 'start' : 'end'}
              trigger={(p) => <button type="button" {...p} className="icon-btn size-8" aria-label="Account menu"><MoreVertical className="size-4" /></button>}
              items={[{ label: 'Log out', icon: LogOut, onSelect: logout, danger: true }]}
            />
          </div>
        </div>
      </motion.aside>
    </>
  );
}
