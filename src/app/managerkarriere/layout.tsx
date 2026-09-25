import { ManagerBottomNav } from "@/components/manager-bottom-nav";

export default function ManagerCareerLayout({ children }: LayoutProps<"/managerkarriere">) {
  // Luft nederst, så fanelinjen aldri dekker det siste på siden.
  return <div className="pb-24">{children}<ManagerBottomNav /></div>;
}
