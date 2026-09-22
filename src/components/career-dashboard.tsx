"use client";

import { useActionState, useState } from "react";
import { createCareerChallengeAction, updateCareerIdentityAction, upgradePlayerStatAction } from "@/lib/career-actions";
import { groupRating, overallRating, STAT_GROUPS, STAT_LABELS, type CareerProfile, upgradeCost } from "@/lib/career-stats";
import type { Friend } from "@/lib/friends";
import type { ActionState } from "@/lib/actions";
import { buttonClass, cardClass, labelClass, secondaryButtonClass } from "./ui";

const initial: ActionState = {};
const positionLabels = { forward: "Spiss", midfielder: "Midtbane", defender: "Forsvarer" };

type Appearance = { skinTone?: string; hair?: string; hairColor?: string; beard?: string; kitNumber?: number; boots?: string; armband?: boolean };
type ClubStyle = { primary?: string; secondary?: string; crest?: string };
const skinTones: Record<string, string> = { light: "#f2c7a5", medium: "#c88f68", dark: "#70452f" };
const bootColors: Record<string, string> = { black: "#121212", white: "#f7f7f7", neon: "#d8ff35" };

function PlayerPreview({ appearance, style, small = false }: { appearance: Appearance; style: ClubStyle; small?: boolean }) {
  const skin = skinTones[appearance.skinTone ?? "medium"] ?? skinTones.medium;
  const hair = appearance.hair ?? "short"; const hairColor = appearance.hairColor ?? "brown"; const primary = style.primary ?? "#35d06a"; const secondary = style.secondary ?? "#071a10";
  const hairShape = hair === "curly" ? "h-7 rounded-full" : hair === "long" ? "h-12 rounded-t-[999px] rounded-b-2xl" : hair === "buzz" ? "h-3 rounded-t-[999px]" : "h-5 rounded-t-[999px]";
  return <div className={`relative mx-auto overflow-hidden rounded-2xl border border-white/20 bg-black/15 ${small ? "h-32 w-28" : "h-56 w-44"}`}>
    <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(90deg, transparent 49%, rgba(255,255,255,.18) 50%, transparent 51%), linear-gradient(0deg, transparent 49%, rgba(255,255,255,.18) 50%, transparent 51%)", backgroundSize: "30px 30px" }} />
    <div className="absolute bottom-3 left-1/2 h-24 w-24 -translate-x-1/2">
      <div className="absolute left-1/2 top-0 h-10 w-9 -translate-x-1/2 rounded-[45%]" style={{ backgroundColor: skin }}><div className={`absolute -top-1 left-0 w-full ${hairShape}`} style={{ backgroundColor: hairColor }} />{appearance.beard && appearance.beard !== "none" ? <div className="absolute bottom-0 left-2 h-3 w-5 rounded-b-full" style={{ backgroundColor: hairColor }} /> : null}</div>
      <div className="absolute left-1/2 top-9 h-12 w-16 -translate-x-1/2 rounded-t-[45%]" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}><div className="absolute left-1/2 top-2 h-2 w-3 -translate-x-1/2 rounded-b-full bg-black/35" /><b className="absolute inset-x-0 top-5 text-center text-sm text-white">{appearance.kitNumber ?? 10}</b>{appearance.armband ? <div className="absolute right-0 top-3 h-2 w-3 rounded-l" style={{ backgroundColor: "#f4d03f" }} /> : null}</div>
      <div className="absolute left-3 top-11 h-10 w-3 rotate-12 rounded-full" style={{ backgroundColor: skin }} /><div className="absolute right-3 top-11 h-10 w-3 -rotate-12 rounded-full" style={{ backgroundColor: skin }} />
      <div className="absolute bottom-0 left-7 h-9 w-4 rounded-b" style={{ backgroundColor: secondary }} /><div className="absolute bottom-0 right-7 h-9 w-4 rounded-b" style={{ backgroundColor: secondary }} /><div className="absolute -bottom-1 left-5 h-2 w-7 rounded" style={{ backgroundColor: bootColors[appearance.boots ?? "black"] ?? bootColors.black }} /><div className="absolute -bottom-1 right-5 h-2 w-7 rounded" style={{ backgroundColor: bootColors[appearance.boots ?? "black"] ?? bootColors.black }} />
    </div>
  </div>;
}

function PlayerCard({ profile }: { profile: CareerProfile }) {
  const overall = overallRating(profile);
  const style = profile.club_style as ClubStyle;
  const appearance = profile.appearance as Appearance;
  return <section className="relative overflow-hidden rounded-2xl border border-white/20 p-6 text-white shadow-2xl" style={{ background: `radial-gradient(circle at 90% 5%, rgba(255,255,255,.24), transparent 35%), linear-gradient(135deg, ${String(style.primary ?? "#35d06a")}, ${String(style.secondary ?? "#071a10")})` }}>
    <div className="absolute right-4 top-3 text-8xl font-black opacity-15">{overall}</div><p className="relative text-xs font-bold tracking-[0.25em]">MIN SPILLER</p>
    <div className="relative mt-4 grid grid-cols-[1fr_auto] items-center gap-4"><div><p className="text-5xl font-black leading-none">{overall}</p><p className="mt-1 text-sm font-semibold uppercase">{positionLabels[profile.primary_position]}</p><h2 className="mt-5 text-2xl font-black uppercase">{profile.player_name}</h2><p className="text-sm text-white/75">#{String(appearance.kitNumber ?? 10)} · {profile.club_name}</p></div><PlayerPreview appearance={appearance} style={style} small /></div>
    <div className="relative mt-5 grid gap-2">{Object.keys(STAT_GROUPS).map((group) => { const rating = groupRating(profile.stats, group as keyof typeof STAT_GROUPS); return <div key={group}><div className="flex justify-between text-xs"><span className="text-white/75">{group}</span><b>{rating}</b></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/20"><div className="h-full rounded-full bg-white/90" style={{ width: `${rating}%` }} /></div></div>; })}</div>
  </section>;
}

function UpgradeGrid({ profile }: { profile: CareerProfile }) {
  const [state, action, pending] = useActionState(upgradePlayerStatAction, initial);
  return <section className={`${cardClass} grid gap-4`}><div className="flex items-baseline justify-between"><div><h2 className="text-lg font-semibold">Bygg spilleren</h2><p className="text-sm text-muted">Velg hvor spillerpoengene dine skal brukes.</p></div><b className="text-accent">{profile.player_points} SP</b></div>
    {Object.entries(STAT_GROUPS).map(([group, stats]) => <div key={group} className="grid gap-2"><h3 className="text-sm font-bold uppercase tracking-wide text-muted">{group} · {groupRating(profile.stats, group as keyof typeof STAT_GROUPS)}</h3><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{stats.map((stat) => { const value = profile.stats[stat]; const cost = upgradeCost(value); const nextStats = { ...profile.stats, [stat]: value + 1 }; const currentGroup = groupRating(profile.stats, group as keyof typeof STAT_GROUPS); const nextGroup = groupRating(nextStats, group as keyof typeof STAT_GROUPS); return <form key={stat} action={action} className="rounded-lg border border-border bg-surface-raised p-3"><input type="hidden" name="stat" value={stat}/><p className="text-xs text-muted">{STAT_LABELS[stat]}</p><div className="mt-1 flex items-center justify-between"><b>{value} <span className="text-muted">→</span> {value + 1}</b><button className="text-xs font-semibold text-accent disabled:opacity-40" disabled={pending || value >= 99 || profile.player_points < cost}>+1 · {cost} SP</button></div><p className="mt-2 text-[11px] text-muted">{nextGroup > currentGroup ? `${group} ${currentGroup} → ${nextGroup}` : `${group} ${currentGroup} holdes`}</p></form>; })}</div></div>)}
    {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}</section>;
}

function IdentityForm({ profile }: { profile: CareerProfile }) {
  const [state, action, pending] = useActionState(updateCareerIdentityAction, initial);
  const [appearance, setAppearance] = useState<Appearance>(profile.appearance as Appearance);
  const [style, setStyle] = useState<ClubStyle>(profile.club_style as ClubStyle);
  const updateLook = (key: keyof Appearance, value: string | number | boolean) => setAppearance((current) => ({ ...current, [key]: value }));
  const updateStyle = (key: keyof ClubStyle, value: string) => setStyle((current) => ({ ...current, [key]: value }));
  return <section className={`${cardClass} grid gap-4`}><div><h2 className="text-lg font-semibold">Utseende og klubb</h2><p className="text-sm text-muted">Alt her er gratis. Forhåndsvisningen oppdateres med én gang.</p></div><form action={action} className="grid gap-5 lg:grid-cols-[auto_1fr]"><div className="rounded-2xl p-4" style={{ background: `linear-gradient(145deg, ${style.primary ?? "#35d06a"}, ${style.secondary ?? "#071a10"})` }}><PlayerPreview appearance={appearance} style={style} /><p className="mt-3 text-center text-sm font-bold text-white">#{appearance.kitNumber ?? 10} · {profile.player_name}</p></div><div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Spillernavn<input className="mt-1 w-full" name="player_name" defaultValue={profile.player_name}/></label><label className={labelClass}>Klubbnavn<input className="mt-1 w-full" name="club_name" defaultValue={profile.club_name}/></label><label className={labelClass}>Posisjon<select className="mt-1 w-full" name="primary_position" defaultValue={profile.primary_position}><option value="forward">Spiss</option><option value="midfielder">Midtbane</option><option value="defender">Forsvarer</option></select></label><label className={labelClass}>Draktnummer<input className="mt-1 w-full" name="kit_number" type="number" min="1" max="99" defaultValue={Number(appearance.kitNumber ?? 10)} onChange={(event) => updateLook("kitNumber", Math.max(1, Math.min(99, Number(event.target.value) || 1)))}/></label><label className={labelClass}>Hår<select className="mt-1 w-full" name="hair" value={appearance.hair ?? "short"} onChange={(event) => updateLook("hair", event.target.value)}><option value="short">Kort</option><option value="curly">Krøllete</option><option value="buzz">Buzz cut</option><option value="long">Langt</option></select></label><label className={labelClass}>Hårfarge<select className="mt-1 w-full" name="hair_color" value={appearance.hairColor ?? "brown"} onChange={(event) => updateLook("hairColor", event.target.value)}><option value="brown">Brun</option><option value="black">Svart</option><option value="blonde">Blond</option><option value="red">Rød</option></select></label><label className={labelClass}>Skjegg<select className="mt-1 w-full" name="beard" value={appearance.beard ?? "none"} onChange={(event) => updateLook("beard", event.target.value)}><option value="none">Ingen</option><option value="short">Kort skjegg</option><option value="full">Skjegg</option></select></label><label className={labelClass}>Hudtone<select className="mt-1 w-full" name="skin_tone" value={appearance.skinTone ?? "medium"} onChange={(event) => updateLook("skinTone", event.target.value)}><option value="light">Lys</option><option value="medium">Medium</option><option value="dark">Mørk</option></select></label><label className={labelClass}>Sko<select className="mt-1 w-full" name="boots" value={appearance.boots ?? "black"} onChange={(event) => updateLook("boots", event.target.value)}><option value="black">Sorte</option><option value="white">Hvite</option><option value="neon">Neon</option></select></label><label className={labelClass}>Klubbfarge<input className="mt-1 h-10 w-full" name="club_primary" type="color" value={style.primary ?? "#35d06a"} onChange={(event) => updateStyle("primary", event.target.value)}/></label><label className={labelClass}>Sekundærfarge<input className="mt-1 h-10 w-full" name="club_secondary" type="color" value={style.secondary ?? "#071a10"} onChange={(event) => updateStyle("secondary", event.target.value)}/></label><label className="flex items-center gap-2 text-sm"><input name="armband" type="checkbox" checked={Boolean(appearance.armband)} onChange={(event) => updateLook("armband", event.target.checked)}/> Kapteinsbind</label><label className="flex items-center gap-2 text-sm"><span>Merke</span><select name="crest" value={style.crest ?? "shield"} onChange={(event) => updateStyle("crest", event.target.value)}><option value="shield">Skjold</option><option value="circle">Sirkel</option><option value="bolt">Lyn</option></select></label><div className="sm:col-span-2"><button className={buttonClass} disabled={pending}>{pending ? "Lagrer…" : "Lagre gratis tilpasninger"}</button>{state.error ? <p className="mt-2 text-sm text-danger">{state.error}</p> : state.ok ? <p className="mt-2 text-sm text-success">Karriereprofilen er lagret.</p> : null}</div></div></form></section>;
}

function ChallengeFriends({ friends, mode }: { friends: Friend[]; mode: "player" | "manager" }) {
  const [state, action, pending] = useActionState(createCareerChallengeAction, initial);
  const title = mode === "player" ? "Utfordre en venn i spillerkarriere" : "Utfordre en venn i managerkarriere";
  const actionLabel = mode === "player" ? "Spillerkarriere" : "Managerkamp";
  return <section className={`${cardClass} grid gap-3`}><div><h2 className="text-lg font-semibold">{title}</h2><p className="text-sm text-muted">{mode === "player" ? "Sammenlign spillernes ferdigheter over ti runder." : "Spill en taktisk kamp med elleverne deres."}</p></div>{friends.length === 0 ? <p className="text-sm text-muted">Legg til venner først for å starte en karrierekamp.</p> : <div className="grid gap-2">{friends.map(friend => <form key={friend.id} action={action} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3"><input type="hidden" name="opponent_id" value={friend.id}/><input type="hidden" name="mode" value={mode}/><b className="mr-auto">{friend.username}</b><button className={mode === "player" ? secondaryButtonClass : buttonClass} disabled={pending}>{actionLabel}</button></form>)}</div>}{state.error ? <p className="text-sm text-danger">{state.error}</p> : state.ok ? <p className="text-sm text-success">Utfordringen er sendt.</p> : null}</section>;
}

function CareerRecord({ profile }: { profile: CareerProfile }) {
  const rows = [
    { label: "Alle kamper", wins: profile.tournament_wins + profile.player_career_wins + profile.manager_career_wins, draws: profile.tournament_draws + profile.player_career_draws + profile.manager_career_draws, losses: profile.tournament_losses + profile.player_career_losses + profile.manager_career_losses },
    { label: "Turneringer", wins: profile.tournament_wins, draws: profile.tournament_draws, losses: profile.tournament_losses },
    { label: "Spillerkarriere", wins: profile.player_career_wins, draws: profile.player_career_draws, losses: profile.player_career_losses },
    { label: "Managerkarriere", wins: profile.manager_career_wins, draws: profile.manager_career_draws, losses: profile.manager_career_losses },
  ];
  return <section className={`${cardClass} grid gap-4`}><div><h2 className="text-lg font-semibold">Kampstatistikk</h2><p className="text-sm text-muted">V/U/T lagres på profilen din, også dersom en turnering senere slettes.</p></div><div className="grid gap-2 sm:grid-cols-2">{rows.map((row) => <div key={row.label} className="rounded-lg border border-border bg-surface-raised p-3"><p className="text-sm font-semibold">{row.label}</p><div className="mt-2 flex gap-3 text-sm"><span className="text-success">V {row.wins}</span><span className="text-accent">U {row.draws}</span><span className="text-danger">T {row.losses}</span></div></div>)}</div></section>;
}

type RewardEvent = { id: string; source_type: string; player_points: number; manager_budget: number; created_at: string };
const rewardLabels: Record<string, string> = { tournament_match: "Turneringskamp", tournament_champion: "Turneringsmester", tournament_finalist: "Finalist", career_match: "Karrierekamp", market_sale: "Kort solgt" };
function RewardHistory({ rewards }: { rewards: RewardEvent[] }) {
  return <section className={`${cardClass} grid gap-3`}><div><h2 className="text-lg font-semibold">Nylige belønninger</h2><p className="text-sm text-muted">Fast historikk over valutaen du har tjent.</p></div>{rewards.length ? <div className="grid gap-2">{rewards.map((reward) => <div key={reward.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3 text-sm"><span>{rewardLabels[reward.source_type] ?? "Belønning"}</span><span className={reward.player_points || reward.manager_budget ? "font-bold text-accent" : "text-muted"}>{reward.player_points ? `+${reward.player_points} SP` : ""}{reward.player_points && reward.manager_budget ? " · " : ""}{reward.manager_budget ? `+${reward.manager_budget} MB` : "Ingen valuta"}</span></div>)}</div> : <p className="text-sm text-muted">Spill en kamp eller fullfør en turnering for å fylle historikken.</p>}</section>;
}

export function CareerDashboard({ profile, friends }: { profile: CareerProfile; friends: Friend[] }) {
  return <div className="grid gap-6"><div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,.65fr)]"><PlayerCard profile={profile}/><section className={`${cardClass} flex flex-col justify-between`}><div><p className="text-sm font-semibold text-muted">SPILLERKARRIERE</p><h2 className="mt-2 text-3xl font-bold">{profile.player_name}</h2><p className="mt-2 text-muted">Oppgrader ferdighetene dine og bygg spilleren du vil være.</p></div><div className="mt-8 rounded-lg bg-accent-soft p-4"><p className="text-xs text-muted">SPILLERPOENG</p><b className="text-2xl">{profile.player_points} SP</b><p className="text-xs text-muted">Tjent: {profile.player_points_earned}</p></div></section></div><ChallengeFriends friends={friends} mode="player"/><UpgradeGrid profile={profile}/><IdentityForm profile={profile}/><section className={cardClass}><h2 className="text-lg font-semibold">Poengsystem</h2><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p>Seier i spillerkarriere: <b>5 SP</b>.</p><p>Uavgjort i spillerkarriere: <b>2 SP</b>.</p><p>Oppgraderinger er permanente.</p><p>Utseende og drakt er alltid gratis.</p></div></section></div>;
}

export function CareerProfileOverview({ profile, rewards }: { profile: CareerProfile; rewards: RewardEvent[] }) {
  return <div className="grid gap-6"><CareerRecord profile={profile}/><RewardHistory rewards={rewards}/><section className={cardClass}><h2 className="text-lg font-semibold">Poengsystem</h2><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p>Spillerkarriere: seier <b>5 SP</b>, uavgjort <b>2 SP</b>.</p><p>Managerkamp: seier <b>5 MB</b>, uavgjort <b>2 MB</b>.</p><p>Turneringskamp: seier <b>3 SP + 3 MB</b>, uavgjort <b>1 + 1</b>.</p><p>Turnering: mester <b>20 + 20</b>, finalist <b>8 + 8</b>.</p></div></section></div>;
}

export function CareerChallengePanel({ friends, mode }: { friends: Friend[]; mode: "player" | "manager" }) {
  return <ChallengeFriends friends={friends} mode={mode}/>;
}
