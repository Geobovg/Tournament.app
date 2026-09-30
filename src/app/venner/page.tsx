import { redirect } from "next/navigation";
import { FriendsPage } from "@/components/friends-page";
import { ModePageHeading } from "@/components/mode-menu";
import { getT } from "@/i18n/server";
import { currentUser } from "@/lib/auth";
import { listFriends, listIncomingRequests, listOutgoingRequests } from "@/lib/friends";

export const dynamic = "force-dynamic";

export default async function VennerPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/venner");

  const [friends, incoming, outgoing, t] = await Promise.all([
    listFriends(user.id),
    listIncomingRequests(user.id),
    listOutgoingRequests(user.id),
    getT(),
  ]);

  return (
    <div className="grid gap-8">
      <ModePageHeading title={t.friends.page.title} description={t.friends.page.description} />
      <FriendsPage friends={friends} incoming={incoming} outgoing={outgoing} />
    </div>
  );
}
