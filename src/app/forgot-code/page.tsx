import { RecoveryForm } from "@/components/auth-forms";
import { getT } from "@/i18n/server";
export default async function ForgotCodePage() { const t = await getT(); return <div className="mx-auto grid max-w-md gap-5"><div><h1 className="text-2xl font-semibold">{t.auth.recovery.title}</h1><p className="text-muted">{t.auth.recovery.intro}</p></div><RecoveryForm /></div>; }
