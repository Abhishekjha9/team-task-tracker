import { motion } from 'framer-motion';
import StatusBadge from './StatusBadge';
import PriorityIndicator from './PriorityIndicator';
import AssigneeChip from './AssigneeChip';
import TaskRowActions from './TaskRowActions';
import TaskCard, { DueDate } from './TaskCard';

/**
 * Task list used on Dashboard and My Tasks: a table from md up (as in the reference's
 * Employees table), stacked cards below. Same handlers either way.
 */
export default function TaskTable({ tasks, pendingIds, currentUserId, onStatusChange, onEdit, onDelete, busy }) {
  const rowProps = (task) => ({ task, pending: pendingIds.has(task.id), currentUserId, onStatusChange, onEdit, onDelete });
  return (
    <div className={`transition-opacity duration-200 ${busy ? 'opacity-60' : ''}`}>
      <div className="card hidden overflow-hidden md:block">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[13px] text-fg-3">
              <th scope="col" className="px-5 py-3.5 font-normal">Task</th>
              <th scope="col" className="w-[17%] px-3 py-3.5 font-normal">Assignee</th>
              <th scope="col" className="w-[11%] px-3 py-3.5 font-normal">Priority</th>
              <th scope="col" className="w-[15%] px-3 py-3.5 font-normal">Status</th>
              <th scope="col" className="w-[15%] px-3 py-3.5 font-normal">Due date</th>
              <th scope="col" className="w-14 px-3 py-3.5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {tasks.map((task, i) => {
              const done = task.status === 'done';
              const perms = task.permissions || {};
              const showCreator = task.creator && task.creator.id !== task.assignee?.id;
              return (
                <motion.tr key={task.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.025, duration: 0.24 } }}
                  className="group transition-colors duration-150 hover:bg-surface-2/60">
                  <td className="px-5 py-3.5">
                    <p className={`truncate font-medium ${done ? 'text-fg-3 line-through decoration-fg-3/50' : 'text-fg'}`}>{task.title}</p>
                    <p className="mt-0.5 truncate text-xs text-fg-3">
                      {task.description || 'No description'}
                      {showCreator && <span> · by {task.creator.id === currentUserId ? 'you' : task.creator.name}</span>}
                    </p>
                  </td>
                  <td className="px-3 py-3.5"><AssigneeChip assignee={task.assignee} currentUserId={currentUserId} /></td>
                  <td className="px-3 py-3.5"><PriorityIndicator priority={task.priority} /></td>
                  <td className="px-3 py-3.5">
                    <StatusBadge status={task.status} disabled={pendingIds.has(task.id) || !perms.canChangeStatus} onChange={(s) => onStatusChange(task, s)} />
                  </td>
                  <td className="px-3 py-3.5"><DueDate date={task.due_date} status={task.status} empty={<span className="text-xs text-fg-3">—</span>} /></td>
                  <td className="px-3 py-3.5 text-right"><TaskRowActions task={task} onEdit={onEdit} onDelete={onDelete} /></td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 md:hidden">
        {tasks.map((task) => <TaskCard key={task.id} {...rowProps(task)} />)}
      </ul>
    </div>
  );
}
