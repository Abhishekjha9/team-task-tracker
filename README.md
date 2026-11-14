# Team Task Tracker

A full-stack team task manager: **React (Vite) + Tailwind + Recharts** on the frontend and **Node/Express + MySQL** on the backend. It supports teams, roles (admin / manager / member), task assignment, and an analytics dashboard. Auth uses JWT and bcrypt. Every query is scoped to the caller's team and role on the server.

```
team-task-tracker/
├── backend/    Express REST API (routes → controllers → services → MySQL), versioned migrations
└── frontend/   React SPA (pages → components, hooks, context, services/* for HTTP)
```

## Quick start

**Prerequisites:** Node 18+ and a MySQL 8+ server.

```bash
# Backend
cd backend
npm install
cp .env.example .env        # set DB_USER / DB_PASSWORD / JWT_SECRET
npm run db:migrate          # creates the DB if needed and applies pending migrations (safe to re-run)
npm run dev                 # http://localhost:5000

# Frontend (second terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173  (proxies /api → :5000)
```

Signing up creates a new team with you as its **admin**. You can then add teammates from the **Team** page.

### Tests

```bash
cd backend
npm test                    # 12 API tests with the DB layer mocked (no MySQL needed)
DB_TESTS=1 npm test         # + 31 integration tests on a throwaway <DB_NAME>_test database
```

The DB test run **drops and recreates `<DB_NAME>_test`** and migrates it from scratch. It refuses to run against any database whose name doesn't end in `_test`, so your dev data is never touched.

## Database and migrations

Migrations live in `backend/migrations/` and are recorded in a `schema_migrations` table.

| Command | What it does |
|---|---|
| `npm run db:migrate` | Apply pending migrations (`db:init` is an alias) |
| `npm run db:status` | List applied (`[x]`) and pending (`[ ]`) migrations |

| Migration | Contents |
|---|---|
| `001_initial_schema.sql` | The original `users` + `tasks(user_id)` schema. It is idempotent, so databases created before migrations existed are adopted as-is. |
| `002_teams_and_assignment.js` | Adds teams, roles, assignment, and status history (details below). |

**What 002 does to existing data (no drops, no resets):**

1. Adds `users.last_login_at`, which powers the "active members" count.
2. Creates `teams` and `team_members(team_id, user_id UNIQUE, role)`. UNIQUE `user_id` means one team per user.
3. Gives **each existing user their own team, as admin.** Users are deliberately not pooled into one shared team: their tasks were private, and merging teams would expose them to each other.
4. Adds `tasks.team_id`, `created_by` and `assigned_to`, then maps `created_by = assigned_to = old user_id` and `team_id = that user's team`.
5. **Aborts before any destructive step if any task couldn't be mapped.** Only then does it add the FKs and indexes and drop the legacy `user_id` column, whose data now lives in `created_by` and `assigned_to`.
6. Creates `task_status_history`. It starts empty: we don't know when existing tasks were completed, so no history is invented.

MySQL DDL auto-commits, so every step checks the current schema state first (via `information_schema`). That makes a partially-failed run safe to re-run, which the migration test verifies.

### Final schema (key columns)

| Table | Columns / constraints |
|---|---|
| `users` | id, name, email **UNIQUE**, password (bcrypt), last_login_at, created_at |
| `teams` | id, name, created_at |
| `team_members` | team_id → teams (CASCADE), user_id → users (CASCADE, **UNIQUE**), role ENUM(admin, manager, member), joined_at; index (team_id, role) |
| `tasks` | team_id → teams (CASCADE), created_by → users (SET NULL), assigned_to → users (SET NULL), title, description, status, priority, due_date, timestamps. Indexes: (team_id, created_at), (team_id, status), (team_id, priority), (assigned_to, status), (created_by) |
| `task_status_history` | task_id → tasks (CASCADE), team_id, from_status, to_status, changed_by, changed_at; index (team_id, to_status, changed_at) |

## Roles and permissions

Rules live in **one module**, [backend/utils/permissions.js](backend/utils/permissions.js). The API enforces them on every request; the frontend reads the same rules only to decide which buttons to show.

| Action | Admin | Manager | Member |
|---|:-:|:-:|:-:|
| View team roster | ✓ | ✓ | ✓ (no workload stats for others) |
| See tasks | whole team | whole team | assigned to them, or created by them |
| Create tasks | ✓ | ✓ | ✓ (assign to self or leave unassigned) |
| Edit tasks | all | all | ones they created |
| Change status | all | all | ones they created or are assigned |
| Assign / reassign | anyone in team | anyone in team | self only, on their own tasks |
| Delete tasks | all | ones they created | ones they created |
| Add members | any role | member / manager | ✗ |
| Edit members / roles | anyone | non-admins; can't grant admin | ✗ |
| Remove members | anyone (not self) | non-admins | ✗ |
| Team-wide analytics | ✓ | ✓ | ✗ (personal only) |

**How the rules are enforced:**

- **Role and team come from the database on every request.** `protect()` re-reads `team_members`, and the JWT carries only the user id. Role changes and removals take effect on the next request, and the request body is never trusted for `team_id`, `created_by` or `role`.
- **A team can't lose its last admin.** Demoting or removing the last admin returns 409. The check runs inside a transaction with `SELECT … FOR UPDATE`, so two concurrent demotions can't both pass.
- **Assignees are validated.** An assignee must be a member of the caller's team (400 otherwise).
- **Other teams' resources look missing.** Tasks or members from another team return **404, not 403**, so the API doesn't reveal that they exist.
- **Removing a member reassigns, never deletes.** Their assigned tasks go to a member you choose, or become unassigned. Tasks they created keep their creator. Their account remains but can no longer log in (403) or use an existing token (401).

## API

All routes except signup and login require `Authorization: Bearer <token>`. Errors always have the shape `{ message, errors? }`.

**Auth**

| Method | Route | Notes |
|---|---|---|
| POST | `/api/auth/signup` | `{ name, email, password, teamName? }` → creates the user, a team, and an admin membership |
| POST | `/api/auth/login` | Returns `{ token, user: { id, name, email, role, team } }` |
| GET | `/api/auth/me` | Current user with role and team |

**Tasks**

| Method | Route | Notes |
|---|---|---|
| GET | `/api/tasks` | `status, priority, search, assignedTo (id\|me), assignmentStatus (assigned\|unassigned), createdBy (id\|me), page, limit`. Each task includes `assignee`, `creator` and `permissions`. |
| GET | `/api/tasks/stats` | Status counts over visible tasks (kept for compatibility) |
| GET | `/api/tasks/:id` | |
| POST | `/api/tasks` | Accepts `assigned_to` (user id or null) |
| PUT | `/api/tasks/:id` | Partial update, including `assigned_to`. Status changes are written to history. |
| DELETE | `/api/tasks/:id` | |

**Team**

| Method | Route | Notes |
|---|---|---|
| GET | `/api/team` | Team info plus overview: total members, members active in the last 30 days, assigned tasks, completed tasks |
| GET | `/api/team/members` | Roster. Per-member task stats are included for admins and managers. |
| GET | `/api/team/members/:userId` | Member detail with stats and completion % (members only get stats for themselves) |
| POST | `/api/team/members` | `{ name, email, role, password? }`. If `password` is omitted, a 12-character temporary password is returned once. |
| PUT | `/api/team/members/:userId` | `{ name?, email?, role? }` |
| DELETE | `/api/team/members/:userId` | `{ reassignTo? }` → `{ tasksReassigned, tasksUnassigned }` |

**Analytics** (`?scope=me|team&from=YYYY-MM-DD&to=YYYY-MM-DD`; members are limited to `me`, and `team` returns 403 for them)

| Route | Returns |
|---|---|
| `GET /api/analytics/overview` | total, todo, inProgress, done, assigned, unassigned, overdue |
| `GET /api/analytics/task-distribution` | Status counts and %, assigned/unassigned counts and %, and an assignment-by-status cross-tab |
| `GET /api/analytics/team-workload` | Per member: assigned tasks by status |
| `GET /api/analytics/completion-trends` | Completions per day from `task_status_history` (defaults to the last 30 days, max 366) |

All analytics use `COUNT` / `SUM` / `GROUP BY` in MySQL. The date range filters tasks by creation date; trends filter by completion date. `scope=me` means **tasks you're responsible for**: those assigned to you, plus unassigned tasks you created.

## Architecture

**Backend**

| Layer | Files |
|---|---|
| Routes | `authRoutes`, `taskRoutes`, `teamRoutes`, `analyticsRoutes`. They contain no SQL. `protect` is on every protected router, and `requireRole()` gates management routes. |
| Controllers | Validate input, call services, choose status codes |
| Services | All SQL, always parameterized: `userService`, `taskService`, `teamService`, `analyticsService` |
| Utils | `permissions.js` (all RBAC rules), `validators.js`, `AppError`, `asyncHandler`, `dates` |
| DB | `config/db.js` (pool + `withTransaction`), `scripts/migrate.js`, `migrations/` |

**Frontend**

| Folder | Contents |
|---|---|
| `pages/` | `Dashboard` (analytics + recent tasks), `Tasks` (full list), `Team`, `Login`, `Signup` |
| `components/` | `AppLayout`, `Sidebar`, `Navbar`, `TaskCard`, `TaskForm`, `TaskFilters`, `StatusBadge`, `Avatar`, `RoleBadge`, `Modal`, `ConfirmDialog`, `Pagination`, `States` (empty/error/skeleton) |
| `components/charts/` | `StatusDonut`, `AssignmentChart`, `WorkloadChart`, `TrendChart`, `ChartCard` |
| `components/team/` | `AddMemberModal`, `MemberDetailsModal`, `RemoveMemberDialog` |
| `context/` | `AuthContext`, `TeamContext` (shared roster), `ToastContext` |
| `hooks/` | `useTasks` (server-side filters, debounced search, optimistic status with rollback), `useAnalytics`, `useDebounce` |
| `services/` | `api.js` (the single Axios instance), `authService`, `taskService`, `teamService`, `analyticsService` |

### Design system and theming

- **Tokens:** all colours, surfaces, borders, radii and shadows are CSS variables in [frontend/src/index.css](frontend/src/index.css). They are defined on `:root` for light mode and on `.dark` for dark mode, then mapped into Tailwind with `@theme inline`. Components only use the semantic names (`bg-surface`, `text-fg-2`, `border-line`, `bg-accent`, `tone-todo`, …), and no component hard-codes a palette colour.
- **Themes:** `ThemeContext` stores a preference of light, dark or system in `localStorage`. An inline script in `index.html` applies the saved theme before first paint, so there's no flash. Switching themes cross-fades colours for about 280ms, and skips the fade when reduced motion is requested.
- **Charts** take their colours as `var(--chart-*)`, so they re-theme without re-rendering. Hover effects use CSS transitions (dimming the other bars and segments, slightly enlarging the active donut segment). Entrance animations only replay when the data changes, and they're disabled under `prefers-reduced-motion`.
- **Shared primitives:** `ui/Select`, `ui/DropdownMenu` (rendered in a portal so it isn't clipped, with keyboard support), `ui/ThemeToggle`, `ui/FormError`, `Modal` (keeps keyboard focus inside), `TaskTable` (a table on desktop, cards on mobile), `PageHeader` and `StatsCard`.
- **Code splitting:** pages are lazy-loaded, so the chart library only downloads with the Dashboard.

Chart colours were checked with a colour-blindness palette validator. Status colours are the same in badges and charts. Because yellow and aqua are below 3:1 contrast on white, every chart also shows its values as text.

## Known limitations

- **One team per user** (allowed by the spec). Multi-team support would need a "current team" selector and a relaxed UNIQUE constraint.
- **Removed members can't be re-added under the same email.** Their account still exists (it keeps their "created by" history), so the duplicate-email rule rejects it. Re-inviting would need an explicit flow.
- **Completion trends only cover status changes made after migration 002.** Older completions have no recorded date and are deliberately not backfilled. Deleting a task also removes its history.
- **"Active members"** means signed in within the last 30 days, based on `last_login_at`, which is only recorded from this release on.
- **No frontend unit tests.** UI flows were verified manually in a headless browser.
- **No down-migrations.** Restore from a backup taken before migrating.
