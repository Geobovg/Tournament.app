"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useT } from "@/i18n/client";
import { clubCrest } from "@/lib/club-crests";
import { playerFlag } from "@/lib/player-nationalities";
import { playerPhoto } from "@/lib/player-photos";
import { specialStyles, type SpecialKind } from "@/lib/special-cards";

// Forkortelsene står i t.career.stats.
export const statKeys = ["pace", "shooting", "passing", "dribbling", "defending", "physical"];
export type CardFacePlayer = { slug: string; name: string; position: string; overall: number; accent: string; club: string; attributes: Record<string, number>; special?: SpecialKind | null };

// eager brukes i pakkeåpningen: kortet dukker opp midt i en animasjon, og lazy-lasting
// gjorde at bildene kom lenge etter kortet, eller ikke i det hele tatt.
export function PlayerCardFace({ player, footer, className = "", eager = false }: { player: CardFacePlayer; footer?: ReactNode; className?: string; eager?: boolean }) {
  const t = useT();
  const loading = eager ? "eager" : "lazy";
  const crest = clubCrest(player.club);
  const photo = playerPhoto(player.slug);
  const flag = playerFlag(player.slug);
  // Spesialkort (f.eks. inform) har egen bakgrunn, gullkant og merke i stedet for «MANAGER CARD».
  const special = player.special ? specialStyles[player.special] : null;
  const background = special ? special.background : `radial-gradient(circle at 90% 8%, ${player.accent}bb 0, transparent 31%), linear-gradient(145deg, #08150e 0%, #102b1a 55%, #06110a 100%)`;
  return <div className={`relative flex min-h-[27rem] flex-col overflow-hidden rounded-2xl border p-4 text-white shadow-xl ${special ? "border-2" : "border-white/15"} ${className}`} style={{ background, ...(special ? { borderColor: special.border, boxShadow: `0 0 28px ${special.glow}55` } : {}) }}>
    <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,.09)_45%,transparent_58%)] opacity-70" />
    {player.special && special ? <p className="relative text-xs font-black tracking-[.32em]" style={{ color: special.badge }}>★ {t.career.special.badge[player.special]}</p> : <p className="relative text-xs font-bold tracking-[.28em] text-white/65">MANAGER CARD</p>}
    <div className="relative mt-2 h-44">
      {photo ? <Image src={photo} alt="" loading={loading} width={256} height={256} className="absolute bottom-0 left-1/2 h-44 w-44 -translate-x-1/2 object-contain object-bottom drop-shadow-[0_10px_18px_rgba(0,0,0,.55)]" /> : <div className="absolute bottom-0 left-1/2 grid h-28 w-28 -translate-x-1/2 place-items-center rounded-full border-2 border-white/35 bg-black/20 text-4xl">⚽</div>}
      <div className="absolute left-0 top-1 grid w-14 justify-items-center gap-1"><b className="text-5xl font-black leading-none tracking-tighter">{player.overall}</b><p className="text-sm font-black tracking-wide">{player.position}</p>{flag ? <Image src={flag} alt="" loading={loading} width={28} height={21} unoptimized className="mt-1 h-[21px] w-7 rounded-[3px] object-cover shadow-md ring-1 ring-black/25" /> : null}{crest ? <span className="mt-1 grid h-8 w-8 place-items-center overflow-hidden rounded-full border border-white/35 bg-white/95"><Image src={crest} alt="" loading={loading} width={24} height={24} className="h-6 w-6 object-contain" /></span> : null}</div>
    </div>
    <div className="relative border-t border-white/25 pt-2 text-center"><h3 className="truncate text-xl font-black uppercase tracking-wide">{player.name}</h3><p className="mt-1 truncate text-xs font-semibold uppercase tracking-[.2em] text-white/65">{t.career.clubName(player.club)}</p></div>
    <div className="relative mt-3 grid grid-cols-3 gap-x-3 gap-y-2 border-y border-white/15 py-3 text-xs">{statKeys.map((key) => <div key={key} className="flex justify-between"><span className="text-white/60">{t.career.stats[key]}</span><b>{player.attributes[key] ?? player.overall}</b></div>)}</div>
    {footer ? <div className="relative mt-auto pt-4">{footer}</div> : null}
  </div>;
}
