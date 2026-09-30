import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  // Behold den gamle URL-en for bokmerker, men ikke vis modusvelgeren i den
  // fotballfokuserte appen.
  redirect("/managerkarriere");
}
