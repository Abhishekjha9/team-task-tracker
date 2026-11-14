import { ChevronDown } from 'lucide-react';

/** Native <select> (keeps keyboard + screen-reader behaviour) with the design-system skin. */
export default function Select({ className = '', wrapperClassName = '', icon: Icon, children, ...props }) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-3" />}
      <select className={`input cursor-pointer appearance-none pr-9 ${Icon ? 'pl-9' : ''} ${className}`} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
    </div>
  );
}
