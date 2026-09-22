import { redirect } from "next/navigation";
import { CareerDashboard } from "@/components/career-dashboard";
import { ChallengeLobby } from "@/components/challenge-lobby";
import { ModePageHeading } from "@/components/mode-menu";
import { currentUser } from "@/lib/auth";
import { getCareerChallenges, getCareerProfile } from "@/lib/career";
import { listFriends } from "@/lib/friends";

export const dynamic = "force-dynamic";

export default async function PlayerCareerPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const [profile, friends, challenges] = await Promise.all([getCareerProfile(user.id), listFriends(user.id), getCareerChallenges(user.id)]);
  return <div className="mx-auto grid max-w-4xl gap-6"><ModePageHeading title="Spillerkarriere" description="Bygg din egen spiller og slå vennene dine i ferdighetsdueller."/><ChallengeLobby challenges={challenges} userId={user.id} mode="player"/><CareerDashboard profile={profile} friends={friends}/></div>;
}
