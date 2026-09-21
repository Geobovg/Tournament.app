import Link from "next/link";
import { CreateTournamentForm } from "@/components/create-tournament-form";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NewTournamentPage() {
  if (!(await currentUser())) redirect("/login");
  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <div>
        <Link href="/turneringer" className="text-sm text-muted hover:underline">
          ← Tilbake
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Ny turnering</h1>
        <p className="text-muted">
          Innstillingene låses når turneringen er opprettet.
        </p>
      </div>

      <CreateTournamentForm />
    </div>
  );
}
