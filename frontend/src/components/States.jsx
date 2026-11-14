import { AlertCircle, RefreshCw } from 'lucide-react';

export function EmptyState({ icon: Icon, title, message, action, compact = false, bare = false }) {
  return (
    <div className={`flex flex-col items-center px-6 text-center ${bare ? '' : 'card'} ${compact ? 'py-8' : 'py-14'}`}>
      <div className="flex size-12 items-center justify-center rounded-2xl border border-line bg-surface-2">
        <Icon className="size-5 text-fg-3" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-fg">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-fg-2">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, compact }) {
  return (
    <EmptyState icon={AlertCircle} title={title} message={message} compact={compact}
      action={onRetry && <button type="button" className="btn-secondary" onClick={onRetry}><RefreshCw className="size-4" />Try again</button>} />
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-surface-3 ${className}`} />;
}

export function TaskListSkeleton({ rows = 4 }) {
  return (
    <div className="card divide-y divide-line" aria-busy="true" aria-label="Loading tasks">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="hidden h-6 w-24 rounded-full sm:block" />
          <Skeleton className="hidden h-6 w-20 rounded-full md:block" />
        </div>
      ))}
    </div>
  );
}
