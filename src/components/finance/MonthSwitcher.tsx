import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { currentMonthKey, monthLabel, shiftMonth } from "@/lib/dates";

// ‹ November 2026 › — changes ?month= in the address bar.
export function MonthSwitcher({ month, basePath }: { month: string; basePath: string }) {
  const now = currentMonthKey();
  const next = shiftMonth(month, 1);
  const href = (k: string) => (k === now ? basePath : `${basePath}?month=${k}`);
  const btn = "grid size-9 place-items-center rounded-lg text-muted transition hover:bg-subtle hover:text-ink";

  return (
    <div className="card flex items-center gap-1 p-1">
      <Link href={href(shiftMonth(month, -1))} className={btn} aria-label="Previous month">
        <ChevronLeft className="size-[18px]" strokeWidth={1.75} />
      </Link>
      <span className="min-w-36 text-center text-[14px] font-medium">{monthLabel(month)}</span>
      {next <= now ? (
        <Link href={href(next)} className={btn} aria-label="Next month">
          <ChevronRight className="size-[18px]" strokeWidth={1.75} />
        </Link>
      ) : (
        <span className={`${btn} opacity-30`} aria-hidden>
          <ChevronRight className="size-[18px]" strokeWidth={1.75} />
        </span>
      )}
    </div>
  );
}
