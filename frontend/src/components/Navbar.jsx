import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Bell, LogOut, Menu, Search, Settings, AlertTriangle, ListChecks } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import RoleBadge from './RoleBadge';
import DropdownMenu from './ui/DropdownMenu';
import { AnimatePresence, motion } from 'framer-motion';
import ThemeToggle, { ThemeToggleButton } from './ui/ThemeToggle';
import { analyticsService } from '../services/analyticsService';

/** Overdue work assigned to the current user — real data from the analytics API. */
function Notifications() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    analyticsService.overview({ scope: 'me' }).then(setSummary).catch(() => setSummary(null));
  }, [pathname]);

  const overdue = summary?.overdue ?? 0;
  const open = summary ? summary.todo + summary.inProgress : 0;
  return (
    <DropdownMenu
      label="Notifications"
      width={288}
      trigger={(p) => (
        <button type="button" {...p} className="icon-btn relative" aria-label={overdue ? `Notifications: ${overdue} overdue` : 'Notifications'}>
          <Bell className="size-[18px]" />
          <AnimatePresence>
            {overdue > 0 && <motion.span key="dot" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute right-2 top-2 size-2 rounded-full bg-danger ring-2 ring-surface" />}
          </AnimatePresence>
        </button>
      )}
      header={
        <div className="space-y-2">
          <p className="text-sm font-semibold text-fg">Notifications</p>
          {!summary ? (
            <p className="text-xs text-fg-3">Couldn't load your summary.</p>
          ) : (
            <>
              <p className="flex items-center gap-2 text-sm text-fg-2">
                <AlertTriangle className={`size-4 ${overdue ? 'text-danger-text' : 'text-fg-3'}`} />
                {overdue ? `${overdue} of your tasks ${overdue === 1 ? 'is' : 'are'} overdue` : 'Nothing overdue. Nice work.'}
              </p>
              <p className="flex items-center gap-2 text-sm text-fg-2"><ListChecks className="size-4 text-fg-3" />{open} open task{open === 1 ? '' : 's'} on your plate</p>
            </>
          )}
        </div>
      }
      items={[{ label: 'View my tasks', icon: ListChecks, onSelect: () => navigate('/tasks') }]}
    />
  );
}

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');

  // Global search jumps to the task list, where the server performs the search.
  const submit = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/tasks?q=${encodeURIComponent(q.trim())}` : '/tasks');
  };

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-[color-mix(in_oklab,var(--bg)_82%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button type="button" className="icon-btn lg:hidden" onClick={onMenuClick} aria-label="Open menu"><Menu className="size-5" /></button>

        <form onSubmit={submit} role="search" className="flex min-w-0 max-w-md flex-1 items-center gap-1 rounded-full border border-line bg-surface py-1 pl-3.5 pr-1 transition-[border-color,box-shadow] duration-200 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15">
          <Search className="size-4 shrink-0 text-fg-3" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks…"
            aria-label="Search tasks"
            className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm text-fg placeholder:text-fg-3 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          <button type="submit" className="hidden rounded-full border border-line-strong bg-surface-2 px-3.5 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-surface-3 sm:block">Search</button>
        </form>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="pill-group hidden sm:flex">
            <Notifications />
            <button type="button" className="icon-btn" onClick={() => navigate('/settings')} aria-label="Settings" title="Settings"><Settings className="size-[18px]" /></button>
          </div>
          <div className="flex items-center sm:hidden"><ThemeToggleButton /><Notifications /></div>
          <ThemeToggle className="hidden sm:flex" />
          <DropdownMenu
            label="Profile"
            width={240}
            trigger={(p) => (
              <button type="button" {...p} className="rounded-full ring-offset-2 ring-offset-bg transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Profile menu">
                <Avatar user={user} className="size-9" />
              </button>
            )}
            header={
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-fg">{user?.name} <RoleBadge role={user?.role} /></p>
                <p className="truncate text-xs text-fg-3">{user?.email}</p>
              </div>
            }
            items={[
              { label: 'Settings', icon: Settings, onSelect: () => navigate('/settings') },
              'separator',
              { label: 'Log out', icon: LogOut, onSelect: logout, danger: true },
            ]}
          />
        </div>
      </div>
    </header>
  );
}
