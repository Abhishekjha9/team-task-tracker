import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { CHART_COLORS } from '../../utils/taskMeta';
import AnimatedNumber from '../ui/AnimatedNumber';
import { softSpring } from '../../utils/motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { axisTick, categoryTick, enterAnimation, focusOpacity, tooltipProps } from './chartConfig';
import ChartTooltip from './ChartTooltip';

const SERIES = [
  { key: 'assigned', name: 'Assigned' },
  { key: 'unassigned', name: 'Unassigned' },
];

/**
 * Assignment is its own dimension: the overall split, then assigned vs unassigned WITHIN each
 * status — so "assigned but still To Do" is visible rather than conflated with status.
 * (A 2-slice pie would hide that, so this uses a split bar + stacked rows.)
 */
export default function AssignmentChart({ data }) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(null);
  const [assigned, unassigned] = data.assignment;
  const rows = useMemo(() => data.assignmentByStatus, [data]);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-baseline justify-between">
          <p className="text-[30px] font-semibold leading-none text-fg"><AnimatedNumber value={data.total} /></p>
          <p className="text-xs text-fg-3">tasks in scope</p>
        </div>
        <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`${assigned.count} assigned, ${unassigned.count} unassigned`}>
          {[assigned, unassigned].map((s) => s.count > 0 && (
            <motion.div key={s.key} className="rounded-full" style={{ background: CHART_COLORS[s.key] }}
              initial={{ width: 0 }} animate={{ width: `${s.percentage}%` }} transition={softSpring} />
          ))}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {[assigned, unassigned].map((s) => (
            <div key={s.key}>
              <dt className="flex items-center gap-2 text-xs text-fg-3"><span className="size-2.5 rounded-[3px]" style={{ background: CHART_COLORS[s.key] }} />{s.label}</dt>
              <dd className="mt-1 text-lg font-semibold text-fg"><AnimatedNumber value={s.count} /> <span className="text-xs font-normal text-fg-3">{s.percentage}%</span></dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <p className="eyebrow mb-2">By status</p>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barCategoryGap={7}
              onMouseMove={(s) => setActive(s?.activeTooltipIndex != null ? Number(s.activeTooltipIndex) : null)} onMouseLeave={() => setActive(null)}>
              <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} />
              <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" width={96} tick={categoryTick} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipProps(reduced)} cursor={{ fill: CHART_COLORS.cursor, radius: 6 }} content={<ChartTooltip />} />
              {SERIES.map((s, si) => (
                <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={CHART_COLORS[s.key]} radius={si === SERIES.length - 1 ? [0, 5, 5, 0] : 0} {...enterAnimation(reduced)}>
                  {rows.map((r, i) => <Cell key={r.status} className="chart-mark" fillOpacity={focusOpacity(active, i)} />)}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
