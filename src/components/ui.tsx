import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight sm:text-[30px]">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-muted">{description}</p>}
      </div>
      {actions}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        {Icon && <Icon className="size-4 text-muted" strokeWidth={1.75} />}
      </div>
      <p className="mt-3 text-[26px] font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
      {children}
    </div>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-subtle", className)}>
      <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="grid size-10 place-items-center rounded-xl bg-subtle">
        <Icon className="size-5 text-muted" strokeWidth={1.75} />
      </div>
      <p className="mt-3 text-[14px] font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-[13px] text-muted">{text}</p>
    </div>
  );
}
