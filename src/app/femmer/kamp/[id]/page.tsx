import { notFound, redirect } from "next/navigation";
import { FiveMatch } from "@/components/femmer/five-match";
import { currentUser } from "@/lib/auth";
import { getFiveMatch } from "@/lib/femmer/data";

export const dynamic = "force-dynamic";

export default async function FemmerMatchPage({ params, searchParams }: PageProps<"/femmer/kamp/[id]">) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { id } = await params; const { live } = await searchParams;
  const match = await getFiveMatch(id, user.id);
  if (!match?.data) notFound();
  // Kampen spilles av med klokke rett etter at den er spilt; fra historikken vises resultatet med en gang.
  return <div className="mx-auto grid w-full max-w-5xl gap-5"><FiveMatch match={match.data} coins={match.coins} viewerIsHome={match.homeUserId === user.id} replay={live === "1"} /></div>;
}
