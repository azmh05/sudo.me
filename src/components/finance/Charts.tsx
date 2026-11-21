import { formatRM, percent } from "@/lib/utils";

// Lightweight charts built from plain HTML, so no chart library is needed.

export function CashflowChart({
  data,
}: {
  data: { key: string; label: string; income: number; expense: number }[];
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const empty = data.every((d) => d.income === 0 && d.expense === 0);

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 text-[12px] text-muted">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-accent" />Income</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-muted/40" />Spending</span>
      </div>
      <div className="relative flex h-44 items-end gap-2 sm:gap-4">
        {empty && (
          <p className="absolute inset-0 grid place-items-center text-[13px] text-muted">No records in these months yet</p>
        )}
        {data.map((d) => (
          <div key={d.key} className="flex h-full flex-1 flex-col justify-end">
            <div className="flex flex-1 items-end justify-center gap-1">
              <div
                title={`Income ${formatRM(d.income)}`}
                className="w-full max-w-5 rounded-t-md bg-accent transition-[height] duration-500"
                style={{ height: `${(d.income / max) * 100}%`, minHeight: d.income ? 3 : 0 }}
              />
              <div
                title={`Spending ${formatRM(d.expense)}`}
                className="w-full max-w-5 rounded-t-md bg-muted/40 transition-[height] duration-500"
                style={{ height: `${(d.expense / max) * 100}%`, minHeight: d.expense ? 3 : 0 }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 border-t border-line pt-2 sm:gap-4">
        {data.map((d) => (
          <span key={d.key} className="flex-1 text-center text-[12px] text-muted">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export function CategoryBars({ items, limit = 6 }: { items: { name: string; amount: number }[]; limit?: number }) {
  const total = items.reduce((s, i) => s + i.amount, 0);
  const shown = items.slice(0, limit);
  const rest = items.slice(limit).reduce((s, i) => s + i.amount, 0);
  const rows = rest > 0 ? [...shown, { name: "Everything else", amount: rest }] : shown;

  return (
    <ul className="space-y-3.5">
      {rows.map((i) => (
        <li key={i.name}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate">{i.name}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {formatRM(i.amount)} · {percent(i.amount, total)}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-subtle">
            <div className="h-full rounded-full bg-accent/80" style={{ width: `${percent(i.amount, total)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
