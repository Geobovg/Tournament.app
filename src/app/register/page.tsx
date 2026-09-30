import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: "Opprett bruker",
  description: "Lag en gratis bruker på Send it! med brukernavn og en sekssifret kode, og start FIFA- og NHL-turneringer med vennene dine.",
  alternates: { canonical: "/register" },
};

export default function RegisterPage() { return <div className="mx-auto grid max-w-md gap-5"><div><h1 className="text-2xl font-semibold">Opprett bruker</h1><p className="text-muted">Turneringene dine følger brukeren din på alle enheter.</p></div><RegisterForm /></div>; }
