import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await currentUser();
  // Managerkarrieren er produktets hovedinngang. Turneringsmodusene lever
  // fortsatt på sine egne URL-er, slik at eksisterende turneringer og invitasjoner
  // ikke påvirkes.
  redirect(user ? "/managerkarriere" : "/login");
}
