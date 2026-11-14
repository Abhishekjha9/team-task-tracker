import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_COLORS } from '../../utils/taskMeta';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { axisTick, categoryTick, enterAnimation, focusOpacity, tooltipProps } from './chartConfig';
import ChartTooltip from './ChartTooltip';

const SERIES = [
  { key: 'todo', name: 'To Do', color: CHART_COLORS.todo },
  { key: 'inProgress', name: 'In Progress', color: CHART_COLORS['in-progress'] },
  { key: 'done', name: 'Completed', color: CHART_COLORS.done },
];

/** Horizontal stacked bars: tasks assigned to each member by status; hovered member stays lit. */
export default function WorkloadChart({ data }) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(null);
  const rows = useMemo(() => data.map((m) => ({ ...m, label: m.name })), [data]);
  const height = Math.max(180, rows.length * 40 + 36);

  return (
    <div>
      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-2" aria-label="Legend">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px]" style={{ background: s.color }} />{s.name}</li>
        ))}
      </ul>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 0 }} barCategoryGap={9}
            onMouseMove={(s) => setActive(s?.activeTooltipIndex != null ? Number(s.activeTooltipIndex) : null)} onMouseLeave={() => setActive(null)}>
            <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} />
            <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" width={112} tick={categoryTick} axisLine={false} tickLine={false} interval={0} />
            <Tooltip {...tooltipProps(reduced)} cursor={{ fill: CHART_COLORS.cursor, radius: 6 }}
              content={<ChartTooltip footer={(p) => `${p[0]?.payload.total ?? 0} assigned in total`} />} />
            {SERIES.map((s, si) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} stackId="w" fill={s.color} radius={si === SERIES.length - 1 ? [0, 5, 5, 0] : 0} {...enterAnimation(reduced)}>
                {rows.map((r, i) => <Cell key={r.userId} className="chart-mark" fillOpacity={focusOpacity(active, i)} />)}
                {si === SERIES.length - 1 && <LabelList dataKey="total" position="right" fontSize={12} fill="var(--fg)" />}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
