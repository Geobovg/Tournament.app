import { redirect } from "next/navigation";
import { LanguageSwitch } from "@/components/language-switch";
import { ModePageHeading } from "@/components/mode-menu";
import { ProfileForms } from "@/components/profile-forms";
import { CareerProfileOverview } from "@/components/career-dashboard";
import { cardClass } from "@/components/ui";
import { getT } from "@/i18n/server";
import { currentUser } from "@/lib/auth";
import { getCareerProfile, listCareerRewards } from "@/lib/career";

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const [career, rewards, t] = await Promise.all([getCareerProfile(user.id), listCareerRewards(user.id), getT()]);
  return <div className="mx-auto grid max-w-4xl gap-6"><ModePageHeading title={t.profile.page.title} description={t.profile.page.description}/><section className={`${cardClass} flex flex-wrap items-center justify-between gap-4`}><div><h2 className="text-lg font-semibold">{t.common.language}</h2><p className="mt-1 text-sm text-muted">{t.common.languageDescription}</p></div><LanguageSwitch /></section><CareerProfileOverview profile={career} rewards={rewards}/><details className="group"><summary className="cursor-pointer text-sm text-muted">{t.profile.page.accountAndSecurity}</summary><div className="mt-4"><ProfileForms username={user.username} avatarUrl={user.avatar_url} /></div></details></div>;
}
