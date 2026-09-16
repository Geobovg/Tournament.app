import { RecoveryForm } from "@/components/auth-forms";
export default function ForgotCodePage() { return <div className="mx-auto grid max-w-md gap-5"><div><h1 className="text-2xl font-semibold">Glemt kode?</h1><p className="text-muted">Vi sender en trygg lenke til e-posten din.</p></div><RecoveryForm /></div>; }
