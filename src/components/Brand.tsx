import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/config";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("size-8", className)}>
      <rect width="64" height="64" rx="16" className="fill-accent" />
      <rect x="17" y="17" width="12" height="30" rx="4" className="fill-accent-ink" />
      <rect x="35" y="17" width="12" height="12" rx="4" className="fill-accent-ink" />
      <rect x="35" y="35" width="12" height="12" rx="4" className="fill-accent-ink" opacity=".45" />
    </svg>
  );
}

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      <div className="leading-tight">
        <p className="text-[15px] font-semibold tracking-tight">{APP_NAME}</p>
        <p className="text-[12px] text-muted">Private workspace</p>
      </div>
    </div>
  );
}
