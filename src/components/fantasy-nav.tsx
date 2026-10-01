"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale, useT } from "@/i18n/client";

const TABS = [
  ["team", "/fantasy"],
  ["points", "/fantasy/points"],
  ["leagues", "/fantasy/leagues"],
  ["fixtures", "/fantasy/fixtures"],
  ["rules", "/fantasy/rules"],
] as const;

export function FantasyNav() {
  const pathname = usePathname();
  const text = useT().fantasy.nav;
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1">
      {TABS.map(([key, href]) => {
        const active = href === "/fantasy" ? pathname === "/fantasy" : pathname.startsWith(href);
        return <Link key={key} href={href} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-accent text-accent-contrast" : "hover:bg-surface-raised"}`}>{text[key]}</Link>;
      })}
    </nav>
  );
}

// Neste frist med nedtelling. now er klokka på serveren (den simulerte i testsesongen),
// så nedtellingen følger den, ikke klokka på telefonen.
export function FantasyDeadline({ round, deadlineAt, now }: { round: number; deadlineAt: string; now: string }) {
  const text = useT().fantasy;
  const locale = useLocale();
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const offset = new Date(now).getTime() - Date.now();
    const update = () => setLeft(Math.max(0, new Date(deadlineAt).getTime() - (Date.now() + offset)));
    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, [deadlineAt, now]);
  let when = "";
  try {
    when = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(deadlineAt));
  } catch {
    when = deadlineAt;
  }
  const minutes = left === null ? 0 : Math.floor(left / 60_000);
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3">
      <p className="font-semibold">{text.editingFor(round)}</p>
      <p className="text-sm text-muted" suppressHydrationWarning>
        {text.deadline(when)}
        {left !== null ? ` · ${text.deadlineIn(text.countdown(Math.floor(minutes / 1440), Math.floor((minutes % 1440) / 60), minutes % 60))}` : ""}
      </p>
    </div>
  );
}
