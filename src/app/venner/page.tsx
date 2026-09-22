import { redirect } from "next/navigation";
import { FriendsPage } from "@/components/friends-page";
import { ModePageHeading } from "@/components/mode-menu";
import { currentUser } from "@/lib/auth";
import { listFriends, listIncomingRequests, listOutgoingRequests } from "@/lib/friends";

export const dynamic = "force-dynamic";

export default async function VennerPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/venner");

  const [friends, incoming, outgoing] = await Promise.all([
    listFriends(user.id),
    listIncomingRequests(user.id),
    listOutgoingRequests(user.id),
  ]);

  return (
    <div className="grid gap-8">
      <ModePageHeading title="Venner" description="Legg til venner for å enklere invitere dem til turneringer." />
      <FriendsPage friends={friends} incoming={incoming} outgoing={outgoing} />
    </div>
  );
}
