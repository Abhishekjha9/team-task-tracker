import { useCallback, useState } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { TeamProvider } from '../context/TeamContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { SIDEBAR_WIDTH, ease, spring } from '../utils/motion';

const KEY = 'tt_sidebar_collapsed';
const readCollapsed = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

/** Authenticated shell: collapsible sidebar + top bar around the routed page. */
export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const desktop = useIsDesktop();
  const { pathname } = useLocation();

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try { localStorage.setItem(KEY, c ? '0' : '1'); } catch { /* ignore */ }
      return !c;
    });
  }, []);
  // Captured per route so the exiting page keeps rendering its own content during the transition.
  const outlet = useOutlet({ collapsed, toggleCollapsed });

  return (
    <TeamProvider>
      <div className="min-h-screen">
        <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        {/* Content padding rides the same spring as the sidebar width, so nothing jumps. */}
        <motion.div initial={false} animate={{ paddingLeft: desktop ? (collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded) : 0 }} transition={spring}>
          <Navbar onMenuClick={() => setMobileOpen(true)} />
          <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease } }} exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}>
                {outlet}
              </motion.div>
            </AnimatePresence>
          </main>
        </motion.div>
      </div>
    </TeamProvider>
  );
}
