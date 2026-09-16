import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getTournamentByInviteCode } from "@/lib/data";

export default async function JoinCodePage({ params }: PageProps<"/join/code/[code]">) {
  const { code } = await params;
  const tournament = await getTournamentByInviteCode(code);
  if (!tournament) notFound();
  if (!(await currentUser())) redirect(`/login?next=/join/code/${code}`);
  redirect(`/join/${tournament.invite_token}`);
}
