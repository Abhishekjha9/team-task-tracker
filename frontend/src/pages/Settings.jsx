import { useOutletContext } from 'react-router-dom';
import { Check, LogOut, Monitor, Moon, PanelLeftClose, Sun } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Avatar from '../components/Avatar';
import RoleBadge from '../components/RoleBadge';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun, preview: 'bg-[#f6f6f9]', bar: 'bg-[#ffffff]', line: 'bg-[#e7e7ee]' },
  { value: 'dark', label: 'Dark', icon: Moon, preview: 'bg-[#0c0c10]', bar: 'bg-[#16161b]', line: 'bg-[#26262f]' },
  { value: 'system', label: 'System', icon: Monitor, preview: 'bg-gradient-to-r from-[#f6f6f9] from-50% to-[#0c0c10] to-50%', bar: 'bg-[#8a8a9b]/30', line: 'bg-[#8a8a9b]/40' },
];

function Section({ title, description, children }) {
  return (
    <section className="card grid gap-5 p-5 sm:p-6 md:grid-cols-[220px_1fr]">
      <div>
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        <p className="mt-1 text-sm text-fg-3">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

/** Personal preferences. Everything here is stored on this device; account data is read-only. */
export default function Settings() {
  const { user, logout } = useAuth();
  const { preference, setPreference } = useTheme();
  const { collapsed, toggleCollapsed } = useOutletContext();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Personalize how Tasktrack looks and behaves on this device." />

      <Section title="Appearance" description="Choose a theme, or follow your operating system.">
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEMES.map((t) => {
            const active = preference === t.value;
            return (
              <button key={t.value} type="button" role="radio" aria-checked={active} onClick={() => setPreference(t.value)}
                className={`group rounded-xl border p-2 text-left transition-all duration-200 ${active ? 'border-accent ring-4 ring-accent/15' : 'border-line hover:border-line-strong'}`}>
                <div className={`flex h-20 gap-1.5 overflow-hidden rounded-lg border border-line p-2 ${t.preview}`}>
                  <div className={`w-1/4 rounded ${t.bar}`} />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className={`h-2 w-2/3 rounded ${t.line}`} />
                    <div className={`flex-1 rounded ${t.bar}`} />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between px-1">
                  <span className="flex items-center gap-2 text-sm font-medium text-fg"><t.icon className="size-4 text-fg-3" />{t.label}</span>
                  {active && <Check className="size-4 text-accent-text" />}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Layout" description="Control the navigation sidebar on larger screens.">
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-surface-2/50 px-4 py-3">
          <span className="flex items-center gap-3">
            <PanelLeftClose className="size-4 text-fg-3" />
            <span>
              <span className="block text-sm font-medium text-fg">Compact sidebar</span>
              <span className="block text-xs text-fg-3">Show icons only, with labels as tooltips.</span>
            </span>
          </span>
          <button type="button" role="switch" aria-checked={collapsed} onClick={toggleCollapsed}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${collapsed ? 'bg-accent' : 'bg-surface-3'}`}>
            <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200 ${collapsed ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
            <span className="sr-only">Compact sidebar</span>
          </button>
        </label>
      </Section>

      <Section title="Profile" description="Your account details. Ask a team admin to change your name, email or role.">
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface-2/50 p-4">
          <Avatar user={user} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-medium text-fg">{user.name} <RoleBadge role={user.role} /></p>
            <p className="truncate text-sm text-fg-2">{user.email}</p>
            <p className="mt-0.5 text-xs text-fg-3">Team: {user.team?.name}</p>
          </div>
          <button type="button" className="btn-secondary" onClick={logout}><LogOut className="size-4" />Log out</button>
        </div>
      </Section>
    </div>
  );
}
