import { motion } from 'framer-motion';
import { fadeUp } from '../../utils/motion';

/** Frame for every chart: title, optional subtitle/aside, skeleton while loading, empty fallback. */
export default function ChartCard({ title, subtitle, aside, loading, empty, emptyMessage = 'No data for this period.', className = '', children }) {
  return (
    <motion.section variants={fadeUp} initial="hidden" animate="show" className={`card flex flex-col p-5 sm:p-6 ${className}`} aria-label={title}>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-fg">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-fg-3">{subtitle}</p>}
        </div>
        {aside}
      </header>
      <div className="relative flex-1">
        {loading ? (
          <div className="h-full min-h-52 animate-pulse rounded-xl bg-surface-2" aria-busy="true" />
        ) : empty ? (
          <div className="flex h-full min-h-52 items-center justify-center rounded-xl border border-dashed border-line-strong px-6 text-center text-sm text-fg-3">{emptyMessage}</div>
        ) : (
          children
        )}
      </div>
    </motion.section>
  );
}
