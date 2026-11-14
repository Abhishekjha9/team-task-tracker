import { useCallback, useEffect, useRef, useState } from 'react';
import { taskService } from '../services/taskService';
import { getErrorMessage } from '../services/api';
import { useDebounce } from './useDebounce';

const EMPTY_PAGE = { tasks: [], currentPage: 1, totalPages: 1, totalTasks: 0 };

/**
 * UI filters -> API params. `assignee` ('me' | <id>) maps to assignedTo and `assignment`
 * ('assigned' | 'unassigned') to assignmentStatus. The API rejects assignedTo together with
 * unassigned, so an assignee is ignored while "Unassigned" is selected.
 */
export function toQuery({ assignee, assignment, ...rest }) {
  const q = { ...rest };
  if (assignment) q.assignmentStatus = assignment;
  if (assignee && assignment !== 'unassigned') q.assignedTo = assignee;
  return q;
}

/**
 * Task list state. Filtering, search and pagination are sent to the API as query params —
 * the list shown is always exactly what the server returned.
 *
 * @param {object} opts.initialFilters  e.g. { assignee: 'me' }
 * @param {number} opts.pageSize
 * @param {function} opts.onChange      called after any successful mutation (e.g. refresh analytics)
 */
export function useTasks({ initialFilters = {}, initialSearch = '', pageSize = 8, onChange } = {}) {
  const [filters, setFilters] = useState(() => ({ status: '', priority: '', assignee: '', assignment: '', search: initialSearch, page: 1, limit: pageSize, ...initialFilters }));
  const [searchInput, setSearchInput] = useState(initialSearch);
  const debouncedSearch = useDebounce(searchInput.trim(), 400);

  const [data, setData] = useState(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const requestId = useRef(0);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Debounced search feeds into filters (and resets to page 1) only after typing pauses.
  useEffect(() => {
    setFilters((f) => (f.search === debouncedSearch ? f : { ...f, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  // Fetch the current page. Stale responses (from earlier filters) are aborted/ignored.
  useEffect(() => {
    const id = ++requestId.current;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    taskService
      .list(toQuery(filters), { signal: controller.signal })
      .then((res) => {
        if (id !== requestId.current) return;
        // e.g. deleted the last task on the final page -> step back to the new last page
        if (res.tasks.length === 0 && filters.page > res.totalPages) {
          setFilters((f) => ({ ...f, page: res.totalPages }));
          return;
        }
        setData(res);
      })
      .catch((err) => {
        if (err.code === 'ERR_CANCELED' || id !== requestId.current) return;
        setError(getErrorMessage(err, 'Could not load tasks.'));
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });

    return () => controller.abort();
  }, [filters, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const changed = useCallback(() => {
    reload();
    onChangeRef.current?.();
  }, [reload]);

  const setFilter = useCallback((key, value) => {
    setFilters((f) => ({ ...f, [key]: value, page: key === 'page' ? value : 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setFilters((f) => ({ ...f, status: '', priority: '', assignee: '', assignment: '', search: '', page: 1 }));
  }, []);

  const createTask = useCallback(async (task) => {
    const created = await taskService.create(task);
    // Newest tasks are listed first, so jump to page 1 to show it.
    setFilters((f) => ({ ...f, page: 1 }));
    changed();
    return created;
  }, [changed]);

  const updateTask = useCallback(async (id, changes) => {
    const updated = await taskService.update(id, changes);
    changed();
    return updated;
  }, [changed]);

  const deleteTask = useCallback(async (id) => {
    await taskService.remove(id);
    changed();
  }, [changed]);

  /**
   * Optimistic status change: update the card immediately, send the request in the
   * background, and revert just this field if the request fails.
   */
  const updateStatus = useCallback(async (task, status) => {
    const previous = task.status;
    if (previous === status) return;

    const patchStatus = (s) =>
      setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === task.id ? { ...t, status: s } : t)) }));

    patchStatus(status);
    setPendingIds((p) => new Set(p).add(task.id));

    try {
      const saved = await taskService.update(task.id, { status });
      setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === task.id ? saved : t)) }));
      onChangeRef.current?.();
    } catch (err) {
      patchStatus(previous);
      throw new Error(getErrorMessage(err, 'Could not update status.'));
    } finally {
      setPendingIds((p) => {
        const next = new Set(p);
        next.delete(task.id);
        return next;
      });
    }
  }, []);

  return {
    ...data,
    filters,
    searchInput,
    setSearchInput,
    setFilter,
    clearFilters,
    loading,
    error,
    reload,
    pendingIds,
    createTask,
    updateTask,
    deleteTask,
    updateStatus,
  };
}
