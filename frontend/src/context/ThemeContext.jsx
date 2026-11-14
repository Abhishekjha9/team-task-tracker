import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const KEY = 'tt_theme';
const ThemeContext = createContext(null);

const systemTheme = () => (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
const readPref = () => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
};

function apply(theme, animate) {
  const root = document.documentElement;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (animate && !reduced) {
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 320);
  }
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

/** preference: 'light' | 'dark' | 'system'. index.html applies it before first paint. */
export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(readPref);
  const [system, setSystem] = useState(systemTheme);
  const theme = preference === 'system' ? system : preference;

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    if (!mq) return undefined;
    const onChange = () => setSystem(mq.matches ? 'light' : 'dark');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Cross-fade only on a real change (not on mount, and not on StrictMode's effect re-run).
  const prevTheme = useRef(null);
  useEffect(() => {
    apply(theme, prevTheme.current !== null && prevTheme.current !== theme);
    prevTheme.current = theme;
  }, [theme]);

  const setPreference = useCallback((p) => {
    setPreferenceState(p);
    try {
      if (p === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, p);
    } catch {
      /* storage unavailable: preference lasts for this session only */
    }
  }, []);

  const value = useMemo(() => ({ theme, preference, setPreference }), [theme, preference, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
