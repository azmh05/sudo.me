import {
  CalendarCheck,
  FolderLock,
  HeartPulse,
  LayoutDashboard,
  Receipt,
  Settings,
  Target,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/bills", label: "Bills & Maintenance", icon: Receipt },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/records", label: "Records", icon: FolderLock },
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/planner", label: "Planner", icon: CalendarCheck },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Shown directly in the phone's bottom bar; the rest go under "More".
export const MOBILE_PRIMARY = ["/", "/finance", "/bills", "/planner"];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
