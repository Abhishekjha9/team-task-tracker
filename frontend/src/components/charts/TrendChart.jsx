import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_COLORS } from '../../utils/taskMeta';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { axisTick, enterAnimation, tooltipProps } from './chartConfig';
import ChartTooltip from './ChartTooltip';

const fmt = (iso, opts) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, opts);

/** Completions per day from real status-change history (single series, so no legend box). */
export default function TrendChart({ data }) {
  const reduced = useReducedMotion();
  const color = CHART_COLORS.done;
  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.series} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
          <XAxis dataKey="date" tickFormatter={(d) => fmt(d, { month: 'short', day: 'numeric' })} tick={axisTick} axisLine={false} tickLine={false} minTickGap={28} />
          <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
          <Tooltip
            {...tooltipProps(reduced)}
            cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1, strokeDasharray: '4 4' }}
            content={({ active, payload, label }) => (
              <ChartTooltip active={active} payload={payload} title={label && fmt(label, { weekday: 'short', month: 'short', day: 'numeric' })} />
            )}
          />
          <Area type="monotone" dataKey="completed" name="Completed" stroke={color} strokeWidth={2} fill="url(#trendFill)" dot={false}
            activeDot={{ r: 5, fill: color, stroke: 'var(--surface)', strokeWidth: 2, className: 'chart-mark' }} {...enterAnimation(reduced)} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
