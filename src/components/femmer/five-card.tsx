"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useT } from "@/i18n/client";
import type { FivePosition } from "@/lib/femmer/rules";
import { playerPhoto } from "@/lib/player-photos";
import { specialStyles } from "@/lib/special-cards";

const sizes = {
  sm: { box: "w-[72px] sm:w-[92px]", photo: "h-14 sm:h-[4.5rem]", rating: "text-lg sm:text-xl", name: "text-[10px] sm:text-xs" },
  md: { box: "w-[118px] sm:w-[140px]", photo: "h-24 sm:h-28", rating: "text-2xl sm:text-3xl", name: "text-xs sm:text-sm" },
  lg: { box: "w-[170px] sm:w-[200px]", photo: "h-36 sm:h-40", rating: "text-4xl", name: "text-base" },
};

/**
 * Et kort i Femmer. Vanlige kort ser ut som de personlige kortene i managerkarrieren, inform-kortene
 * har inform-utseendet. Posisjonen står under ratingen; `warn` viser at kortet står utenfor posisjon.
 */
export function FiveCardTile({ name, slug, overall, position, inform = false, size = "md", label, footer, selected = false, dimmed = false, warn = false, eager = false }: { name: string; slug: string; overall: number; position?: FivePosition | null; inform?: boolean; size?: keyof typeof sizes; label?: ReactNode; footer?: ReactNode; selected?: boolean; dimmed?: boolean; warn?: boolean; eager?: boolean }) {
  const t = useT().femmer;
  const style = specialStyles[inform ? "inform" : "personal"];
  const photo = playerPhoto(slug);
  const s = sizes[size];
  return <div className={`relative flex flex-col overflow-hidden rounded-xl border-2 p-1.5 text-white shadow-lg transition-transform ${s.box} ${selected ? "scale-105 ring-4 ring-lime-300" : ""} ${dimmed ? "opacity-40 grayscale" : ""}`} style={{ background: style.background, borderColor: style.border, boxShadow: `0 0 16px ${style.glow}55` }}>
    <div className="flex items-start justify-between gap-1">
      <div className="grid leading-none">
        <b className={`font-black tracking-tighter drop-shadow ${s.rating}`}>{overall}</b>
        {position !== undefined ? <span className={`mt-0.5 text-[9px] font-black tracking-wider sm:text-[10px] ${warn ? "text-red-200" : ""}`}>{position ? t.squad.roles[position] : "?"}</span> : null}
      </div>
      {label ? <span className={`rounded px-1 text-[9px] font-black tracking-wider sm:text-[10px] ${warn ? "bg-red-600/80" : "bg-black/35"}`}>{label}</span> : inform ? <span className="rounded bg-black/40 px-1 text-[9px] font-black tracking-wider sm:text-[10px]" style={{ color: style.badge }}>IF</span> : null}
    </div>
    <div className={`relative ${s.photo}`}>
      {photo ? <Image src={photo} alt="" draggable={false} width={256} height={256} loading={eager ? "eager" : "lazy"} className="absolute inset-x-0 bottom-0 mx-auto h-full w-auto object-contain object-bottom drop-shadow-[0_6px_10px_rgba(0,0,0,.45)]" /> : <div className="absolute inset-0 grid place-items-center text-3xl">⚽</div>}
    </div>
    <p className={`truncate rounded bg-black/35 px-1 text-center font-black uppercase tracking-wide ${s.name}`}>{name}</p>
    {footer ? <div className="mt-1">{footer}</div> : null}
  </div>;
}
