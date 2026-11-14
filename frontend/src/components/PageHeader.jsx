/** Consistent page title block: title, description, and right-aligned actions. */
export default function PageHeader({ title, description, actions, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1 text-sm text-fg-2">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
