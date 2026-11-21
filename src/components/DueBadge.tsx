import { dueInfo, expiryInfo, type DueTone } from "@/lib/schedule";
import { cn } from "@/lib/utils";

export function ToneBadge({ tone, label, className }: { tone: DueTone; label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium",
        tone === "overdue" && "bg-negative/10 text-negative",
        tone === "soon" && "bg-warning/10 text-warning",
        tone === "later" && "bg-subtle text-muted",
        className,
      )}
    >
      {label}
    </span>
  );
}

// "Due in 3 days" for bills; "Expires in 12 days" for documents.
export function DueBadge({
  date,
  variant = "due",
  remindDays,
  className,
}: {
  date: string;
  variant?: "due" | "expiry";
  remindDays?: number;
  className?: string;
}) {
  const { label, tone } = variant === "expiry" ? expiryInfo(date, remindDays) : dueInfo(date);
  return <ToneBadge tone={tone} label={label} className={className} />;
}
