import type { Metadata } from "next";
import { LoginForm } from "@/components/auth-forms";

// Dette er siden søkemotorene ser, siden alle andre sider sender dem hit.
export const metadata: Metadata = {
  title: { absolute: "Send it! – FIFA- og NHL-turneringer med vennene dine" },
  alternates: { canonical: "/login" },
};

export default function LoginPage() { return <div className="mx-auto grid min-h-[calc(100dvh-8rem)] max-w-md content-center gap-5"><div><h1 className="text-2xl font-semibold">Logg inn</h1><p className="text-muted">Bruk din personlige sekssifrede kode.</p></div><LoginForm /></div>; }
