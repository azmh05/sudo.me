import { Hammer } from "lucide-react";
import { PageHeader } from "./ui";

export function ComingSoon({ title, description, step, features }: { title: string; description: string; step: number; features: string[] }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-subtle">
            <Hammer className="size-5 text-muted" strokeWidth={1.75} />
          </div>
          <div>
            <p className="eyebrow">Coming in step {step}</p>
            <p className="text-[15px] font-medium">This module is being built next.</p>
          </div>
        </div>
        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {features.map((f) => (
            <li key={f} className="rounded-xl bg-subtle px-4 py-3 text-[14px] text-muted">
              {f}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
