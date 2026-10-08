import Image from "next/image";
import type { FivePerson } from "@/lib/femmer/data";
import { playerPhoto } from "@/lib/player-photos";
import { specialStyles } from "@/lib/special-cards";

/**
 * Bakgrunnen i Femmer: en vegg av alle de personlige kortene, svakt i bakgrunnen. Lista hentes fra
 * databasen hver gang, så et nytt personlig kort dukker opp her med en gang det er delt ut.
 */
export function FiveGalleryBackground({ people }: { people: FivePerson[] }) {
  const withPhoto = people.filter((person) => playerPhoto(person.slug));
  if (!withPhoto.length) return null;
  // Nok kort til å fylle en stor skjerm, med samme rekkefølge hver gang.
  const tiles = Array.from({ length: Math.max(72, withPhoto.length) }, (_, index) => withPhoto[(index * 7) % withPhoto.length]);
  const style = specialStyles.personal;
  // Eget lag (translateZ) og ingen uskarphet: ellers må mobilen tegne hele veggen på nytt ved hver scroll og hvert trykk.
  return <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden [contain:strict] [transform:translateZ(0)]">
    <div className="absolute -inset-[15%] flex -rotate-[8deg] flex-wrap content-start justify-center gap-3 opacity-[.14]">
      {tiles.map((person, index) => <div key={index} className="relative h-28 w-20 overflow-hidden rounded-lg border-2 sm:h-36 sm:w-24" style={{ background: style.background, borderColor: style.border }}>
        <Image src={playerPhoto(person.slug)!} alt="" width={96} height={96} draggable={false} className="absolute inset-x-0 bottom-0 mx-auto h-[85%] w-auto object-contain object-bottom" />
      </div>)}
    </div>
    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/70 to-slate-950/90" />
  </div>;
}
