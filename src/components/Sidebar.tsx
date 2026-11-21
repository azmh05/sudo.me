"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { NAV, isActive } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { Brand } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";

export function Sidebar({ userName, photoId }: { userName: string; photoId: number | null }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-bg px-4 py-6 lg:flex">
      <div className="px-2">
        <Brand />
      </div>

      <nav className="mt-8 flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors duration-150",
                active
                  ? "bg-surface font-medium text-ink shadow-[var(--shadow)] ring-1 ring-line"
                  : "text-muted hover:bg-subtle hover:text-ink",
              )}
            >
              <Icon className="size-[18px]" strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line pt-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link href="/profile" title="Profile">
              <Avatar photoId={photoId} name={userName} className="size-8 text-[13px]" />
            </Link>
            <span className="truncate text-[14px] font-medium">{userName}</span>
          </div>
          <ThemeToggle />
        </div>
        <form action={logoutAction} className="mt-2">
          <button type="submit" className="btn-ghost h-9 w-full justify-start px-3 text-[14px]">
            <LogOut className="size-[18px]" strokeWidth={1.75} />
            Lock & sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
