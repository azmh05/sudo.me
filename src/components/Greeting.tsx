"use client";

import { useEffect, useState } from "react";

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const dateFmt = new Intl.DateTimeFormat("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-MY", { hour: "numeric", minute: "2-digit", hour12: true });

// Live date and clock. Renders after mount so server and phone clocks never clash.
export function Greeting({ name }: { name: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="eyebrow min-h-[18px]">{now ? dateFmt.format(now) : ""}</p>
        <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight sm:text-[30px]">
          {now ? greetingFor(now.getHours()) : "Welcome"}, {name}
        </h1>
      </div>
      <p className="text-[28px] font-light tabular-nums tracking-tight text-muted sm:text-[32px]">
        {now ? timeFmt.format(now) : ""}
      </p>
    </header>
  );
}
