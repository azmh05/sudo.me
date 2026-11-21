"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/finance", label: "Overview" },
  { href: "/finance/transactions", label: "Records" },
  { href: "/finance/accounts", label: "Accounts" },
  { href: "/finance/budget", label: "Budget" },
  { href: "/finance/categories", label: "Categories" },
];

export function FinanceTabs() {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex gap-1 rounded-xl bg-subtle p-1">
        {TABS.map((t) => {
          const active = t.href === "/finance" ? pathname === "/finance" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[14px] transition",
                active ? "bg-surface font-medium text-ink shadow-[var(--shadow)]" : "text-muted hover:text-ink",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
