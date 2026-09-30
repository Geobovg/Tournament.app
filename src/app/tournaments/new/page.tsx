import Link from "next/link";
import { CreateTournamentForm } from "@/components/create-tournament-form";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/i18n/server";

export default async function NewTournamentPage() {
  if (!(await currentUser())) redirect("/login");
  const text = (await getT()).tournaments.newPage;
  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <div>
        <Link href="/turneringer" className="text-sm text-muted hover:underline">
          ← {text.back}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{text.title}</h1>
        <p className="text-muted">
          {text.intro}
        </p>
      </div>

      <CreateTournamentForm />
    </div>
  );
}
