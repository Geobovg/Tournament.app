import Image from "next/image";
import type { PointerEvent, ReactNode } from "react";
import type { FantasyPhoto } from "@/lib/fantasy/data";

// Banen og spillerkortene i fantasy, i samme stil som Premier League Fantasy. Brukes både
// i lagbyggeren og på poengsiden, så de har ingen tilstand selv.

export function FantasyPitch({ children, bench }: { children: ReactNode; bench?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-950/40 bg-emerald-800 text-white">
      <div className="relative grid gap-3 px-1 py-4 sm:gap-5 sm:px-4 sm:py-6" style={{ backgroundImage: "repeating-linear-gradient(180deg, rgb(21 128 61) 0 3rem, rgb(22 101 52) 3rem 6rem)" }}>
        <svg aria-hidden viewBox="0 0 400 560" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" fill="none" stroke="rgb(255 255 255 / 0.28)" strokeWidth="2" vectorEffect="non-scaling-stroke">
          <rect x="8" y="8" width="384" height="544" vectorEffect="non-scaling-stroke" />
          <rect x="88" y="8" width="224" height="88" vectorEffect="non-scaling-stroke" />
          <rect x="148" y="8" width="104" height="32" vectorEffect="non-scaling-stroke" />
          <path d="M160 96 A48 48 0 0 0 240 96" vectorEffect="non-scaling-stroke" />
          <line x1="8" y1="552" x2="392" y2="552" vectorEffect="non-scaling-stroke" />
          <path d="M140 552 A60 60 0 0 1 260 552" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="relative grid gap-3 sm:gap-5">{children}</div>
      </div>
      {bench ? <div className="grid gap-2 bg-emerald-950/70 p-2 sm:p-3">{bench}</div> : null}
    </div>
  );
}

export function PitchRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-center gap-1 sm:gap-3">{children}</div>;
}

// avatar: rundt bilde i lista. Ellers står utklippet fritt (som draktene i FPL), og ansiktsbildene
// fra API-Football, som har hvit bakgrunn og er tett beskåret, vises i en hvit sirkel.
export function FantasyPlayerPhoto({ photo, photoCutout, crest, avatar = false, className = "" }: FantasyPhoto & { crest?: string | null; avatar?: boolean; className?: string }) {
  const image = !photo ? <span className="grid h-full w-full place-items-center text-xl text-slate-300">⚽</span>
    : photoCutout ? <Image src={photo} alt="" fill sizes="(min-width: 640px) 112px, 64px" className={avatar ? "origin-top scale-150 object-cover object-top" : "object-contain object-bottom drop-shadow-[0_4px_4px_rgb(0_0_0/0.35)]"} />
    // API-Football-bildene er små, ferdige PNG-er. De sendes rett fra kilden.
    : <Image src={photo} alt="" fill sizes="96px" unoptimized className="object-cover object-top" />;
  return (
    <span className={`relative block ${avatar ? "overflow-hidden rounded-full bg-white" : ""} ${className}`}>
      {avatar || photoCutout ? image : (
        <span className="absolute inset-x-0 bottom-1 mx-auto block aspect-square h-[66%] overflow-hidden rounded-full bg-white shadow-md shadow-black/30 ring-2 ring-white">{image}</span>
      )}
      {crest ? <Image src={crest} alt="" width={20} height={20} className={`absolute h-4 w-4 object-contain drop-shadow sm:h-5 sm:w-5 ${avatar ? "right-0 top-0" : "bottom-0 right-1.5 sm:right-3"}`} /> : null}
    </span>
  );
}

// Et kort på banen som i FPL: drakten (eller bildet, for klubber uten drakt) står over en hvit
// navnelapp, med en mørk lapp under (rundens kamper, pris eller poeng).
// Med onDragStart kan kortet dras og slippes på et annet kort (data-player-id viser hvilket).
export function FantasyPlayerCard({ player, info, badge, marker, selected = false, dimmed = false, dropTarget = false, onTap, onDragStart, dragId, title }: {
  player: FantasyPhoto & { name: string; crest: string | null; kit?: string | null };
  info: ReactNode;
  badge?: string | null;
  marker?: ReactNode;
  selected?: boolean;
  dimmed?: boolean;
  dropTarget?: boolean;
  onTap?: () => void;
  onDragStart?: (event: PointerEvent<HTMLButtonElement>) => void;
  dragId?: number;
  title?: string;
}) {
  const body = (
    <>
      {badge ? <span className="absolute left-0 top-0 z-10 grid h-5 w-5 place-items-center rounded-full bg-slate-950 text-[10px] font-black text-white ring-1 ring-white sm:h-6 sm:w-6 sm:text-xs">{badge}</span> : null}
      {marker ? <span className="absolute left-0.5 top-6 z-10 text-xs font-black drop-shadow sm:top-7">{marker}</span> : null}
      {player.kit ? (
        <span className="relative mx-auto block h-[3.75rem] w-[3.25rem] sm:h-[6.25rem] sm:w-[5.5rem]">
          <Image src={player.kit} alt="" fill sizes="(min-width: 640px) 88px, 52px" className="object-contain object-bottom drop-shadow-[0_4px_4px_rgb(0_0_0/0.35)]" />
        </span>
      ) : <FantasyPlayerPhoto photo={player.photo} photoCutout={player.photoCutout} crest={player.crest} className="-mx-1.5 h-[3.75rem] sm:-mx-2.5 sm:h-[6.25rem]" />}
      <span className="relative block w-full overflow-hidden rounded-md shadow-md shadow-black/30">
        <span className="block truncate bg-white px-0.5 py-0.5 text-[10px] font-bold leading-tight text-slate-950 sm:text-xs">{lastName(player.name)}</span>
        <span className="block truncate bg-emerald-950/85 px-0.5 py-0.5 text-[10px] font-semibold leading-tight text-white sm:text-[11px]">{info}</span>
      </span>
    </>
  );
  const className = `relative block w-[3.5rem] rounded-lg text-center transition sm:w-24 ${selected ? "bg-yellow-300/25 ring-2 ring-yellow-300" : ""} ${dimmed ? "opacity-40" : ""} ${dropTarget ? "bg-white/25 ring-2 ring-white" : ""}`;
  return onTap
    ? (
      <button
        type="button"
        onClick={onTap}
        onPointerDown={onDragStart}
        // Hindrer nettleserens egen bildedraging og menyen som kommer når man holder fingeren inne.
        onDragStart={onDragStart ? (event) => event.preventDefault() : undefined}
        onContextMenu={onDragStart ? (event) => event.preventDefault() : undefined}
        data-player-id={dragId}
        title={title ?? player.name}
        className={`${className} hover:-translate-y-0.5 ${onDragStart ? "select-none [-webkit-touch-callout:none]" : ""}`}
      >{body}</button>
    )
    : <div title={title ?? player.name} className={className}>{body}</div>;
}

// En plass på benken med merkelapp over, som «GK» og «1. DEF» i FPL (rekkefølgen innbytterne kommer inn i).
export function BenchSlot({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid justify-items-center gap-1"><span className="text-[10px] font-bold text-white/70 sm:text-xs">{label}</span>{children}</div>;
}

export function EmptyPitchSlot({ label }: { label: string }) {
  return <span className="grid h-[5.9rem] w-[3.5rem] place-items-center rounded-lg border border-dashed border-white/40 bg-white/5 text-[10px] text-white/60 sm:h-[8.75rem] sm:w-24 sm:text-xs">{label}</span>;
}

// Som i FPL står bare etternavnet på kortet («Haaland»). Navn med ett ord (Pedri) står som de er.
export function lastName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return name;
  // «João Pedro» og «Vinícius Júnior» blir ikke bare «Pedro» og «Júnior».
  const givenLast = /^(j[uú]nior|jr\.?|filho|neto|pedro|paulo|lucas|henrique|felipe|filipe|luiz|lu[ií]s|gabriel|gustavo|rafael|andr[eé]|carlos|ricardo|mário|mario|victor|vitor|miguel|jos[eé])$/i;
  if (parts.length === 2 && givenLast.test(parts[1])) return name;
  // «E. Haaland» fra API-Football og «Kevin De Bruyne»: alt etter første fornavn, men korte forledd beholdes.
  const particles = new Set(["de", "da", "di", "van", "von", "der", "den", "dos", "del", "la", "le", "ter", "ten"]);
  let start = parts.length - 1;
  if (start > 1 && givenLast.test(parts[start])) start--;
  while (start > 1 && particles.has(parts[start - 1].toLocaleLowerCase())) start--;
  return parts.slice(start).join(" ");
}
