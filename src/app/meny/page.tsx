import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClass, cardClass, secondaryButtonClass } from "@/components/ui";
import { currentUser } from "@/lib/auth";

const modes = [
  { href: "/managerkarriere", kicker: "DITT LAG", title: "Manager Karriere", description: "Sett elleveren, kjøp kort og vinn taktiske kamper mot vennene dine.", action: "Åpne managerkarriere", tone: "from-sky-500/35 via-sky-950 to-slate-950" },
  { href: "/turneringer", kicker: "SAMMEN MED VENNER", title: "Turneringer", description: "Opprett, bli med i og følg FIFA- og NHL-turneringene deres.", action: "Se turneringer", tone: "from-amber-400/35 via-amber-950 to-slate-950" },
];

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  return <div className="mx-auto grid max-w-5xl gap-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold tracking-[0.2em] text-accent">SEND IT! FOOTBALL</p><h1 className="mt-2 text-3xl font-bold">Hei, {user.username}</h1><p className="mt-1 text-muted">Velg hva du vil spille.</p></div><div className="flex flex-wrap gap-2"><Link href="/profile" className={secondaryButtonClass}>Profil</Link><Link href="/venner" className={secondaryButtonClass}>Venner</Link></div></div><section className="grid gap-6 md:grid-cols-2">{modes.map((mode) => <Link key={mode.href} href={mode.href} className={`group relative min-h-80 overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br ${mode.tone} p-8 text-white shadow-lg transition hover:-translate-y-1 hover:border-white/40`}><div className="absolute -right-8 -top-10 text-[13rem] font-black leading-none text-white/10">⚽</div><div className="relative flex h-full flex-col"><p className="text-xs font-bold tracking-[0.2em] text-white/70">{mode.kicker}</p><h2 className="mt-5 text-3xl font-black">{mode.title}</h2><p className="mt-4 max-w-md text-base leading-7 text-white/80">{mode.description}</p><span className={`${buttonClass} mt-auto self-start bg-white text-slate-950 hover:bg-white/90`}>{mode.action}</span></div></Link>)}</section><section className={`${cardClass} flex flex-wrap items-center justify-between gap-3`}><div><h2 className="font-semibold">To moduser, én historie</h2><p className="mt-1 text-sm text-muted">Resultater og belønninger lagres på profilen din.</p></div><Link href="/profile" className={secondaryButtonClass}>Se statistikk og belønninger</Link></section></div>;
}
