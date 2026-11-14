import { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';
import AnimatedNumber from '../ui/AnimatedNumber';
import { CHART_COLORS } from '../../utils/taskMeta';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { enterAnimation } from './chartConfig';

/**
 * Part-to-whole of the three statuses. Hovering a segment or a legend row highlights the
 * same status in both places; the active segment eases outward, the others fade, and the
 * centre label switches to that status's count — so no floating tooltip covers the ring.
 */
export default function StatusDonut({ data }) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(null);
  const rows = useMemo(
    () => data.status.map((s) => ({ ...s, name: s.label, value: s.count, fill: CHART_COLORS[s.status] })),
    [data],
  );
  const hovered = active !== null ? rows[active] : null;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
      <div className="relative size-48 shrink-0" onMouseLeave={() => setActive(null)}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" innerRadius="70%" outerRadius="94%" startAngle={90} endAngle={-270} cornerRadius={4} paddingAngle={rows.filter((r) => r.value).length > 1 ? 2 : 0}
              stroke="none" onMouseEnter={(_, i) => setActive(i)} {...enterAnimation(reduced)}>
              {rows.map((r, i) => (
                <Cell key={r.status} fill={r.fill} className={`donut-seg ${active === i ? 'is-active' : ''} ${active !== null && active !== i ? 'is-dim' : ''}`} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <AnimatedNumber value={hovered ? hovered.count : data.total} duration={0.35} className="text-[30px] font-semibold leading-none text-fg" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={hovered?.status ?? 'total'} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.14 }}
              className="mt-1.5 text-xs text-fg-3">
              {hovered ? `${hovered.label} · ${hovered.percentage}%` : 'Total tasks'}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
      <table className="w-full text-sm">
        <caption className="sr-only">Tasks by status</caption>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.status} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
              className={`cursor-default border-b border-line transition-opacity duration-200 last:border-0 ${active !== null && active !== i ? 'opacity-45' : ''}`}>
              <th scope="row" className="py-2.5 text-left font-normal text-fg-2">
                <span className="mr-2.5 inline-block size-2.5 rounded-[3px] align-middle" style={{ background: r.fill }} />
                {r.label}
              </th>
              <td className="py-2.5 text-right font-semibold tabular-nums text-fg">{r.count}</td>
              <td className="w-16 py-2.5 text-right tabular-nums text-fg-3">{r.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
