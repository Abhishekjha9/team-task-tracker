import { motion } from 'framer-motion';
import AnimatedNumber from './ui/AnimatedNumber';
import { fadeUp } from '../utils/motion';

/** Metric tile: label, large value, contextual footnote derived from real data, and an icon. */
export default function StatsCard({ label, value, icon: Icon, hint, loading }) {
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -2 }} className="card group relative overflow-hidden p-4 transition-[border-color] duration-200 hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-sm text-fg-2">{label}</p>
        {Icon && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-fg-3 transition-colors duration-200 group-hover:text-accent-text">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      {loading ? (
        <div className="mt-2 h-8 w-16 animate-pulse rounded-md bg-surface-3" />
      ) : (
        <p className="mt-1 text-[28px] font-semibold leading-tight tracking-tight text-fg"><AnimatedNumber value={value} /></p>
      )}
      {hint && <p className="mt-1.5 truncate text-xs text-fg-3">{loading ? '\u00a0' : hint}</p>}
    </motion.div>
  );
}
