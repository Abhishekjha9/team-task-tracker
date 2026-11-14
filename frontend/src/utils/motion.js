// Shared motion language: one spring, one ease, and reusable variants so every
// animated element in the app moves the same way.
export const spring = { type: 'spring', stiffness: 420, damping: 36, mass: 0.9 };
export const softSpring = { type: 'spring', stiffness: 260, damping: 30 };
export const ease = [0.2, 0.7, 0.2, 1];

export const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease } },
};

export const stagger = (gap = 0.05, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

export const popover = {
  initial: { opacity: 0, scale: 0.96, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.16, ease } },
  exit: { opacity: 0, scale: 0.97, y: -2, transition: { duration: 0.1 } },
};

// Sidebar widths are shared by the sidebar and the content padding (same spring).
export const SIDEBAR_WIDTH = { expanded: 264, collapsed: 76 };
