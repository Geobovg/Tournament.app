import { redirect } from "next/navigation";
import { ProfileForms } from "@/components/profile-forms";
import { CareerProfileOverview } from "@/components/career-dashboard";
import { currentUser } from "@/lib/auth";
import { getCareerProfile, listCareerRewards } from "@/lib/career";

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const [career, rewards] = await Promise.all([getCareerProfile(user.id), listCareerRewards(user.id)]);
  return <div className="mx-auto grid max-w-4xl gap-6"><div><h1 className="text-3xl font-bold">Profil</h1><p className="text-muted">Se historikken din og hold kontoen oppdatert.</p></div><CareerProfileOverview profile={career} rewards={rewards}/><details className="group"><summary className="cursor-pointer text-sm text-muted">Konto og sikkerhet</summary><div className="mt-4"><ProfileForms username={user.username} avatarUrl={user.avatar_url} /></div></details></div>;
}
