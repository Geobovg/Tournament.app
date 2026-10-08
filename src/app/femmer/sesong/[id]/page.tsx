import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FiveSeasonDetails } from "@/components/femmer/five-seasons";
import { secondaryButtonClass } from "@/components/ui";
import { getT } from "@/i18n/server";
import { currentUser } from "@/lib/auth";
import { listFriends } from "@/lib/friends";
import { getFiveSeason } from "@/lib/femmer/seasons";

export const dynamic = "force-dynamic";

export default async function FemmerSeasonPage({ params }: PageProps<"/femmer/sesong/[id]">) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const [season, friends, t] = await Promise.all([getFiveSeason(id), listFriends(user.id), getT()]);
  // Bare de som er med eller invitert, ser sesongen. Andre kommer inn via invitasjonslenken.
  if (!season || !season.members.some((member) => member.userId === user.id)) notFound();
  return <div className="mx-auto grid w-full max-w-5xl gap-5">
    <Link href="/femmer?tab=sesong" className={`${secondaryButtonClass} justify-self-start`}>{t.femmer.seasons.back}</Link>
    <FiveSeasonDetails season={season} userId={user.id} friends={friends.map((friend) => ({ id: friend.id, username: friend.username }))} />
  </div>;
}
