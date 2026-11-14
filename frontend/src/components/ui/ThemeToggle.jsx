import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

/** Sun / moon segmented switch (as in the reference's top bar). */
export default function ThemeToggle({ className = '' }) {
  const { theme, setPreference } = useTheme();
  const opts = [
    { value: 'light', icon: Sun, label: 'Light theme' },
    { value: 'dark', icon: Moon, label: 'Dark theme' },
  ];
  return (
    <div role="radiogroup" aria-label="Color theme" className={`pill-group ${className}`}>
      {opts.map(({ value, icon: Icon, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setPreference(value)}
            className={`relative flex size-8 items-center justify-center rounded-full transition-colors duration-200 ${active ? 'text-fg' : 'text-fg-3 hover:text-fg'}`}
          >
            {active && <motion.span layoutId={`theme-pill-${className}`} className="absolute inset-0 rounded-full bg-surface-3 shadow-sm" />}
            <motion.span key={`${value}-${active}`} className="relative" initial={active ? { rotate: -60, scale: 0.6 } : false} animate={{ rotate: 0, scale: 1 }}>
              <Icon className="size-4" />
            </motion.span>
          </button>
        );
      })}
    </div>
  );
}

/** Single-button variant for tight spaces (mobile top bar). */
export function ThemeToggleButton({ className = '' }) {
  const { theme, setPreference } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  const Icon = theme === 'dark' ? Sun : Moon;
  return (
    <button type="button" onClick={() => setPreference(next)} className={`icon-btn ${className}`} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      <motion.span key={theme} initial={{ rotate: -90, scale: 0.5, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }}>
        <Icon className="size-[18px]" />
      </motion.span>
    </button>
  );
}
