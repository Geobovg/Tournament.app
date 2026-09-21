import Link from "next/link";
import { secondaryButtonClass } from "./ui";

export function ModeMenuLink() {
  return <Link href="/meny" className={secondaryButtonClass}>← Meny</Link>;
}

export function ModePageHeading({ title, description }: { title: string; description: string }) {
  return <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">{title}</h1><p className="mt-1 text-muted">{description}</p></div><ModeMenuLink /></div>;
}
