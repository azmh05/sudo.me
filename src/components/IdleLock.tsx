"use client";

import { useEffect, useRef } from "react";
import { logoutAction } from "@/app/actions/auth";

// Signs out after `minutes` without any mouse, keyboard, touch or scroll activity.
// Also locks if the tab/app was in the background for longer than that.
export function IdleLock({ minutes }: { minutes: number }) {
  const last = useRef(Date.now());

  useEffect(() => {
    if (!minutes) return;
    const limit = minutes * 60_000;
    const bump = () => (last.current = Date.now());
    const check = () => {
      if (Date.now() - last.current >= limit) void logoutAction();
    };
    const events = ["mousemove", "keydown", "pointerdown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(check, 15_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [minutes]);

  return null;
}
