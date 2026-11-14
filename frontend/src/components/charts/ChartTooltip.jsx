/** Theme-aware tooltip body: values in text ink, a swatch carries series identity. */
export default function ChartTooltip({ active, payload, label, title, formatter = (v) => v, footer }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="animate-tip-in min-w-40 rounded-xl border border-line bg-elevated px-3 py-2.5 text-xs shadow-[var(--shadow-pop)]">
      {(title || label) && <p className="mb-1.5 font-medium text-fg">{title || label}</p>}
      <ul className="space-y-1">
        {payload.map((p) => (
          <li key={p.dataKey ?? p.name} className="flex items-center gap-2 text-fg-2">
            <span className="size-2 rounded-[3px]" style={{ background: p.payload?.fill ?? p.color }} />
            <span className="flex-1">{p.name}</span>
            <span className="font-semibold tabular-nums text-fg">{formatter(p.value, p)}</span>
          </li>
        ))}
      </ul>
      {footer && <p className="mt-2 border-t border-line pt-1.5 text-fg-3">{footer(payload)}</p>}
    </div>
  );
}
