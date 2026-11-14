import { CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeUp, stagger } from '../utils/motion';
import Logo from './Logo';
import ThemeToggle from './ui/ThemeToggle';

const POINTS = ['Assign work and see who owns what', 'Live status, workload and completion analytics', 'Role-based access for admins, managers and members'];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Subtle brand glow + grid, purely decorative */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-240px] h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-accent/15 blur-[120px] dark:bg-accent/20" />
        <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
      </div>

      <header className="relative flex items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 pb-12">
        <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2">
          <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="hidden lg:block">
            <motion.p variants={fadeUp} className="tone-accent inline-flex rounded-full px-3 py-1 text-xs font-medium">Team task management</motion.p>
            <motion.h2 variants={fadeUp} className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-fg">Plan, assign and ship work — together.</motion.h2>
            <motion.p variants={fadeUp} className="mt-4 max-w-md text-fg-2">Tasktrack keeps every task, owner and deadline in one calm workspace.</motion.p>
            <motion.ul variants={stagger(0.06)} className="mt-8 space-y-3">
              {POINTS.map((p) => (
                <motion.li variants={fadeUp} key={p} className="flex items-center gap-3 text-sm text-fg-2"><CheckCircle2 className="size-4 text-accent-text" />{p}</motion.li>
              ))}
            </motion.ul>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.05 }} className="mx-auto w-full max-w-[420px]">
            <div className="card p-6 shadow-[var(--shadow-pop)] sm:p-8">
              <h1 className="text-[22px] font-semibold tracking-tight text-fg">{title}</h1>
              <p className="mt-1 text-sm text-fg-2">{subtitle}</p>
              <div className="mt-6">{children}</div>
            </div>
            <p className="mt-6 text-center text-sm text-fg-3">{footer}</p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
