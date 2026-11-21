"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, MoreHorizontal, X } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { MOBILE_PRIMARY, NAV, isActive } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

const SHORT: Record<string, string> = { "Bills & Maintenance": "Bills" };

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const primary = NAV.filter((n) => MOBILE_PRIMARY.includes(n.href));
  const more = NAV.filter((n) => !MOBILE_PRIMARY.includes(n.href));
  const moreActive = more.some((n) => isActive(pathname, n.href));

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] lg:hidden" onClick={() => setOpen(false)}>
          <div
            className="card absolute inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {more.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex h-12 items-center gap-3 rounded-xl px-3 text-[15px]",
                  isActive(pathname, href) ? "bg-subtle font-medium" : "text-ink",
                )}
              >
                <Icon className="size-5 text-muted" strokeWidth={1.75} />
                {label}
              </Link>
            ))}
            <div className="mt-1 flex items-center justify-between border-t border-line pt-1">
              <ThemeToggle withLabel className="h-12" />
              <form action={logoutAction}>
                <button type="submit" className="btn-ghost h-12 text-[14px]">
                  <LogOut className="size-[18px]" strokeWidth={1.75} />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid h-[68px] max-w-lg grid-cols-5">
          {primary.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-[11px] transition-colors",
                  active ? "font-medium text-ink" : "text-muted",
                )}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2 : 1.6} />
                {SHORT[label] ?? label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[11px]",
              open || moreActive ? "font-medium text-ink" : "text-muted",
            )}
          >
            {open ? <X className="size-[22px]" strokeWidth={1.6} /> : <MoreHorizontal className="size-[22px]" strokeWidth={1.6} />}
            More
          </button>
        </div>
      </nav>
    </>
  );
}
