import Link from "next/link";
import { redirect } from "next/navigation";
import { FantasyPitch, PitchRow } from "@/components/fantasy-pitch";
import { Crest, FantasyPlayerInfoProvider, InfoPlayerCard } from "@/components/fantasy-player-info";
import { cardClass, secondaryButtonClass } from "@/components/ui";
import { getT } from "@/i18n/server";
import { currentUser } from "@/lib/auth";
import { currentRound, getCurrentFantasySeason, listFantasyPlayers, type FantasyPlayerOption } from "@/lib/fantasy/data";
import { bestEleven, FANTASY_POSITIONS } from "@/lib/fantasy/squad-rules";
import { getRoundStats, type StatEntry } from "@/lib/fantasy/stats";

export const dynamic = "force-dynamic";

// Topp 5-liste med spiller og et tall (poeng, antall eller prosent).
function StatList({ title, entries, players, format, none }: { title: string; entries: StatEntry[]; players: Map<number, FantasyPlayerOption>; format: (value: number) => string; none: string }) {
  return (
    <section className={`${cardClass} grid content-start gap-2`}>
      <h3 className="font-semibold">{title}</h3>
      {entries.length ? (
        <ol className="grid gap-1 text-sm">
          {entries.map((entry) => {
            const player = players.get(entry.playerId);
            return (
              <li key={entry.playerId} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <Crest src={player?.crest ?? null} small />
                  <span className="truncate">{player?.name ?? "?"}</span>
                </span>
                <span className="font-semibold tabular-nums">{format(entry.value)}</span>
              </li>
            );
          })}
        </ol>
      ) : <p className="text-sm text-muted">{none}</p>}
    </section>
  );
}

export default async function FantasyStatsPage({ searchParams }: PageProps<"/fantasy/stats">) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const t = await getT();
  const text = t.fantasy.statsPage;
  const season = await getCurrentFantasySeason();
  if (!season) return <div className={cardClass}><p className="text-muted">{t.fantasy.noSeason}</p></div>;
  const latest = currentRound(season);
  if (!latest) return <div className={cardClass}><p className="text-muted">{t.fantasy.pointsPage.noRounds}</p></div>;

  const params = await searchParams;
  const requested = Number(params.round);
  const round = season.rounds.find((item) => item.number === requested && item.locked) ?? latest;
  const [stats, allPlayers] = await Promise.all([getRoundStats(season.apiSeason, round.number), listFantasyPlayers(season.apiSeason, season.now)]);
  const players = new Map(allPlayers.map((player) => [player.id, player]));
  const locked = season.rounds.filter((item) => item.locked).map((item) => item.number);
  const previous = locked.filter((number) => number < round.number).at(-1);
  const next = locked.find((number) => number > round.number);
  const link = (number: number) => `/fantasy/stats?round=${number}`;

  const scored = stats.playerPoints.flatMap((entry) => {
    const player = players.get(entry.playerId);
    return player ? [{ ...player, points: entry.value }] : [];
  });
  const dreamTeam = bestEleven(scored);
  const star = dreamTeam[0];
  const shown = new Set(dreamTeam.map((player) => player.id));
  const percent = (value: number) => text.percent(value);
  const count = (value: number) => String(value);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {previous ? <Link href={link(previous)} className={secondaryButtonClass}>{t.fantasy.pointsPage.previous}</Link> : <span />}
        <h2 className="text-xl font-bold">{t.fantasy.round(round.number)} <span className="text-sm font-medium text-muted">· {round.finished ? t.fantasy.pointsPage.finished : t.fantasy.pointsPage.live}</span></h2>
        {next ? <Link href={link(next)} className={secondaryButtonClass}>{t.fantasy.pointsPage.next}</Link> : <span />}
      </div>

      <div className={`${cardClass} grid grid-cols-2 gap-4 text-center sm:grid-cols-4`}>
        <div><p className="text-xs text-muted">{text.average}</p><p className="text-2xl font-black tabular-nums">{stats.averagePoints}</p></div>
        <div>
          <p className="text-xs text-muted">{text.highest}</p>
          <p className="text-2xl font-black tabular-nums">{stats.highest?.points ?? "–"}</p>
          {stats.highest ? <Link href={`/fantasy/points?round=${round.number}&team=${stats.highest.teamId}`} className="block truncate text-xs text-muted hover:underline">{stats.highest.teamName}</Link> : null}
        </div>
        <div><p className="text-xs text-muted">{text.transfersMade}</p><p className="text-2xl font-black tabular-nums">{stats.transfersMade}</p></div>
        <div>
          <p className="text-xs text-muted">{text.playerOfRound}</p>
          <p className="text-2xl font-black tabular-nums">{star ? star.points : "–"}</p>
          {star ? <p className="truncate text-xs text-muted">{star.name}</p> : null}
        </div>
      </div>

      <section className="grid gap-2">
        <h3 className="font-semibold">{text.dreamTeam}</h3>
        {dreamTeam.length ? (
          <FantasyPlayerInfoProvider players={allPlayers.filter((player) => shown.has(player.id))}>
            <FantasyPitch>
              {FANTASY_POSITIONS.map((position) => (
                <PitchRow key={position}>
                  {dreamTeam.filter((player) => player.position === position).map((player) => (
                    <InfoPlayerCard key={player.id} playerId={player.id} player={player} info={<span className="font-black">{player.points}</span>} badge={player.id === star?.id ? "★" : null} />
                  ))}
                </PitchRow>
              ))}
            </FantasyPitch>
          </FantasyPlayerInfoProvider>
        ) : <div className={cardClass}><p className="text-sm text-muted">{text.none}</p></div>}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatList title={text.mostSelected} entries={stats.mostSelected} players={players} format={percent} none={text.none} />
        <StatList title={text.mostCaptained} entries={stats.mostCaptained} players={players} format={percent} none={text.none} />
        <StatList title={text.mostViceCaptained} entries={stats.mostViceCaptained} players={players} format={percent} none={text.none} />
        <StatList title={text.transfersIn} entries={stats.transfersIn} players={players} format={count} none={text.none} />
        <StatList title={text.transfersOut} entries={stats.transfersOut} players={players} format={count} none={text.none} />
        <section className={`${cardClass} grid content-start gap-2`}>
          <h3 className="font-semibold">{text.chipsPlayed}</h3>
          {stats.chipsPlayed.length ? (
            <ul className="grid gap-1 text-sm">
              {stats.chipsPlayed.map((entry) => (
                <li key={entry.chip} className="flex justify-between gap-3"><span>{t.fantasy.chips.names[entry.chip]}</span><span className="font-semibold tabular-nums">{entry.count}</span></li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">{text.none}</p>}
        </section>
      </div>
    </div>
  );
}
