import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth-forms";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t.auth.register.metaTitle,
    description: t.auth.register.metaDescription,
    alternates: { canonical: "/register" },
  };
}

export default async function RegisterPage() {
  const t = await getT();
  return <div className="mx-auto grid max-w-md gap-5"><div><h1 className="text-2xl font-semibold">{t.auth.register.title}</h1><p className="text-muted">{t.auth.register.intro}</p></div><RegisterForm /></div>;
}
