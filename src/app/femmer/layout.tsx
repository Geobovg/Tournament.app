import { FiveGalleryBackground } from "@/components/femmer/five-gallery-background";
import { listFivePeople } from "@/lib/femmer/data";

export const dynamic = "force-dynamic";

export default async function FemmerLayout({ children }: LayoutProps<"/femmer">) {
  const people = await listFivePeople();
  return <><FiveGalleryBackground people={people} />{children}</>;
}
