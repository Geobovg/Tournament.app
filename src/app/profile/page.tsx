import { redirect } from "next/navigation";
import { ProfileForms } from "@/components/profile-forms";
import { currentUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return <div className="mx-auto grid max-w-xl gap-5"><div><h1 className="text-2xl font-semibold">Min bruker</h1><p className="text-muted">Endre brukernavn eller profilbilde.</p></div><ProfileForms username={user.username} avatarUrl={user.avatar_url} /></div>;
}
