import Link from "next/link";
import { redirect } from "next/navigation";
import { cardClass, secondaryButtonClass } from "@/components/ui";
import { getLocale, getT } from "@/i18n/server";
import { currentUser } from "@/lib/auth";
import { getCurrentFantasySeason } from "@/lib/fantasy/data";
import { formatPrice } from "@/lib/fantasy/pricing";
import { getTeamHistory, type HistoryRow } from "@/lib/fantasy/stats";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Column = "round" | "points" | "benchPoints" | "roundRank" | "transfers" | "transferCost" | "totalPoints" | "overallRank" | "value";
// Samme kolonner og rekkefølge som rundehistorikken i FPL.
const COLUMNS: Column[] = ["round", "points", "benchPoints", "roundRank", "transfers", "transferCost", "totalPoints", "overallRank", "value"];

// Rundehistorikken til et lag, som i FPL: poeng, plassering, bytter og lagverdi per runde, og
// når chipene ble brukt. Uten ?team= vises ditt eget lag.
export default async function FantasyHistoryPage({ searchParams }: PageProps<"/fantasy/history">) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const text = t.fantasy.historyPage;
  const season = await getCurrentFantasySeason();
  if (!season) return <div className={cardClass}><p className="text-muted">{t.fantasy.noSeason}</p></div>;

  const params = await searchParams;
  let teamId = typeof params.team === "string" ? params.team : null;
  if (!teamId) {
    const { data } = await supabaseAdmin().from("fantasy_teams").select("id").eq("user_id", user.id).eq("api_season", season.apiSeason).maybeSingle();
    teamId = data?.id ?? null;
  }
  const history = teamId ? await getTeamHistory(season.apiSeason, teamId) : null;
  const pointsLink = `/fantasy/points${params.team ? `?team=${params.team}` : ""}`;
  const cell = (row: HistoryRow, column: Column) => {
    if (column === "value") return t.fantasy.money(formatPrice(row.value, locale));
    if (column === "transferCost") return row.transferCost ? `−${row.transferCost}` : "0";
    return String(row[column]);
  };
  const chips = history?.rows.filter((row) => row.chip) ?? [];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{text.title}</h2>
        <Link href={pointsLink} className={secondaryButtonClass}>{text.back}</Link>
      </div>
      {!history || !history.rows.length ? <div className={cardClass}><p className="text-muted">{text.noRounds}</p></div> : (
        <>
          <div className={cardClass}>
            <p className="font-semibold">{history.teamName}</p>
            <p className="text-sm text-muted">{history.username} · {text.teams(history.teams)}</p>
          </div>
          <section className={`${cardClass} overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  {COLUMNS.map((column) => <th key={column} className={`px-2 py-1.5 font-semibold ${column === "round" ? "text-left" : "text-right"}`} title={text.columns[column][1]}>{text.columns[column][0]}</th>)}
                </tr>
              </thead>
              <tbody>
                {[...history.rows].reverse().map((row) => (
                  <tr key={row.round} className="border-t border-border">
                    {COLUMNS.map((column) => (
                      <td key={column} className={`px-2 py-2 tabular-nums ${column === "round" ? "text-left" : "text-right"} ${column === "points" ? "font-semibold" : ""}`}>
                        {column === "round" ? <Link href={`/fantasy/points?round=${row.round}&team=${history.teamId}`} className="hover:underline">{row.round}</Link> : cell(row, column)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className={`${cardClass} grid gap-2`}>
            <h3 className="font-semibold">{text.chipsTitle}</h3>
            {chips.length ? (
              <ul className="grid gap-1 text-sm">
                {chips.map((row) => <li key={row.round} className="flex justify-between gap-3"><span>{t.fantasy.chips.names[row.chip!]}</span><span className="text-muted">{t.fantasy.round(row.round)}</span></li>)}
              </ul>
            ) : <p className="text-sm text-muted">{text.chipsNone}</p>}
          </section>
        </>
      )}
    </div>
  );
}
