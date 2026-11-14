// Shared motion + tooltip settings so every chart moves the same way.
export const enterAnimation = (reduced) => ({
  isAnimationActive: !reduced,
  animationDuration: 700,
  animationEasing: 'ease-out',
});

export const tooltipProps = (reduced) => ({
  isAnimationActive: !reduced,
  animationDuration: 200,
  animationEasing: 'ease-out',
  // Tooltip never captures the pointer, so moving across it can't cause flicker.
  wrapperStyle: { outline: 'none', pointerEvents: 'none' },
  allowEscapeViewBox: { x: false, y: true },
  offset: 18,
});

export const axisTick = { fontSize: 11, fill: 'var(--chart-axis)' };
export const categoryTick = { fontSize: 12, fill: 'var(--fg-2)' };

/** Opacity for a mark given the hovered index (null = nothing hovered). */
export const focusOpacity = (active, i) => (active === null || active === i ? 1 : 0.38);
