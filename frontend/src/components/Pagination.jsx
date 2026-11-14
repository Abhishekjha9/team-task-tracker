import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, totalTasks, pageSize, onPageChange, disabled }) {
  const from = totalTasks === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalTasks);
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-sm text-fg-3">
        Showing <span className="font-medium text-fg-2">{from}–{to}</span> of <span className="font-medium text-fg-2">{totalTasks}</span>
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary px-2.5" onClick={() => onPageChange(currentPage - 1)} disabled={disabled || currentPage <= 1}>
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>
        <span className="min-w-20 text-center text-sm text-fg-3">
          Page <span className="font-medium text-fg">{currentPage}</span> of {totalPages}
        </span>
        <button type="button" className="btn-secondary px-2.5" onClick={() => onPageChange(currentPage + 1)} disabled={disabled || currentPage >= totalPages}>
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}
