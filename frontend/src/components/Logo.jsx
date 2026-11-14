import { Check } from 'lucide-react';

export default function Logo({ className = '', compact = false }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#8b6cff] to-[#5b3fe0] shadow-[var(--accent-glow)]">
        <Check className="size-4.5 text-white" strokeWidth={3} />
      </div>
      {!compact && <span className="text-[17px] font-semibold tracking-tight text-fg">Tasktrack</span>}
    </div>
  );
}
