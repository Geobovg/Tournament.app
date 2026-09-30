import Link from "next/link";
import { getT } from "@/i18n/server";
import { secondaryButtonClass } from "./ui";

export async function ModeMenuLink() {
  const t = await getT();
  return <Link href="/managerkarriere" className={secondaryButtonClass}>← {t.career.bottomNav.home}</Link>;
}

export function ModePageHeading({ title, description }: { title: string; description: string }) {
  return <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">{title}</h1><p className="mt-1 text-muted">{description}</p></div><ModeMenuLink /></div>;
}
