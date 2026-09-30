"use client";

import { useT } from "@/i18n/client";

// Vises med en gang man bytter fane, så trykket føles umiddelbart mens siden hentes.
export default function ManagerSectionLoading() {
  const t = useT();
  return <div className="mx-auto grid w-full max-w-[1600px] gap-5" aria-busy="true" aria-label={t.career.loading}>
    <div className="h-[88px] animate-pulse rounded-2xl border border-white/10 bg-[#08101b]" />
    <div className="h-10 animate-pulse rounded-xl bg-white/5" />
    <div className="grid gap-2 rounded-2xl border border-white/10 p-4">
      <div className="h-6 w-48 animate-pulse rounded bg-white/10" />
      {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-14 animate-pulse rounded-lg bg-white/5" />)}
    </div>
  </div>;
}
