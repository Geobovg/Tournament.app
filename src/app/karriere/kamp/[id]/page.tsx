import { redirect } from "next/navigation";

// Kampsiden har flyttet inn under managerkarrieren. Gamle lenker sendes videre.
export default async function OldCareerMatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ historikk?: string }> }) {
  const { id } = await params; const { historikk } = await searchParams;
  redirect(`/managerkarriere/kamp/${id}${historikk === "1" ? "?historikk=1" : ""}`);
}
